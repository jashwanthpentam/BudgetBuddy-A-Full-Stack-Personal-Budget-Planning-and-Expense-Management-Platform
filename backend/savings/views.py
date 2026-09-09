from datetime import date
from decimal import Decimal

from django.db.models import Sum
from rest_framework import generics, permissions, status
from rest_framework.generics import RetrieveAPIView
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from .models import SavingsGoal
from .serializers import SavingsGoalSerializer
from .services import (
    check_goal_deadlines,
    period_totals,
    refresh_goal_allocations,
)
from notifications.utils import create_notification


def _parse_period(request):
    period = (request.query_params.get("period") or "month").lower()
    if period == "month":
        today = date.today()
        month = int(request.query_params.get("month", today.month))
        year = int(request.query_params.get("year", today.year))
        if not 1 <= month <= 12:
            raise ValueError("month must be between 1 and 12")
        if not 2000 <= year <= 2100:
            raise ValueError("year must be between 2000 and 2100")
        return period, month, year, None, None
    if period == "custom":
        start_raw = request.query_params.get("start_date")
        end_raw = request.query_params.get("end_date")
        if not start_raw or not end_raw:
            raise ValueError("start_date and end_date are required for custom period")
        start_date = date.fromisoformat(start_raw)
        end_date = date.fromisoformat(end_raw)
        if start_date > end_date:
            raise ValueError("start_date cannot be after end_date")
        return period, None, None, start_date, end_date
    if period == "lifetime":
        return period, None, None, None, None
    raise ValueError("period must be month, custom, or lifetime")


class SavingsListCreateView(generics.ListCreateAPIView):
    serializer_class = SavingsGoalSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SavingsGoal.objects.filter(user=self.request.user).order_by("is_finalized", "target_date", "-target_amount", "id")

    def get_serializer_context(self):
        context = super().get_serializer_context()
        allocations = check_goal_deadlines(self.request.user)
        context["allocations"] = allocations
        return context

    def perform_create(self, serializer):
        goal = serializer.save(user=self.request.user)
        create_notification(
            user=self.request.user,
            title="Savings Goal Created",
            message=f"Your savings goal '{goal.goal_name}' has been created successfully.",
            notification_type="saving",
        )
        refresh_goal_allocations(self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        refresh_goal_allocations(request.user)
        goal = SavingsGoal.objects.get(pk=serializer.instance.pk, user=request.user)
        allocations = check_goal_deadlines(request.user)

        data = SavingsGoalSerializer(
            goal,
            context={"request": request, "allocations": allocations},
        ).data
        return Response(
            data,
            status=status.HTTP_201_CREATED,
            headers=self.get_success_headers(data),
        )


class SavingsDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = SavingsGoalSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SavingsGoal.objects.filter(user=self.request.user)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        allocations = check_goal_deadlines(self.request.user)
        context["allocations"] = allocations
        return context

    def perform_update(self, serializer):
        goal = serializer.save()
        refresh_goal_allocations(goal.user)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=partial,
        )
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        refresh_goal_allocations(request.user)
        instance.refresh_from_db()
        allocations = check_goal_deadlines(request.user)

        data = SavingsGoalSerializer(
            instance,
            context={"request": request, "allocations": allocations},
        ).data
        return Response(data)

    def perform_destroy(self, instance):
        user = instance.user
        instance.delete()
        refresh_goal_allocations(user)


class GoalProgressAPIView(RetrieveAPIView):
    serializer_class = SavingsGoalSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SavingsGoal.objects.filter(user=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        goal = self.get_object()
        allocations = check_goal_deadlines(request.user)
        return Response(SavingsGoalSerializer(goal, context={"allocations": allocations}).data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def savings_summary(request):
    try:
        period, month, year, start_date, end_date = _parse_period(request)
        income, expense, net = period_totals(
            request.user, period=period, month=month, year=year,
            start_date=start_date, end_date=end_date,
        )
    except (ValueError, TypeError) as exc:
        return Response({"error": str(exc)}, status=400)

    allocations = check_goal_deadlines(request.user)
    _, unallocated = refresh_goal_allocations(request.user, notify=False)
    goals = list(SavingsGoal.objects.filter(user=request.user).order_by("target_date", "-target_amount", "id"))
    active_goals = [g for g in goals if g.is_active and not g.is_finalized]
    finalized_goals = [g for g in goals if g.is_finalized]
    completed_goals = [g for g in finalized_goals if g.status == "Completed"]
    total_target = sum((Decimal(g.target_amount) for g in active_goals), Decimal("0"))
    active_saved = sum((Decimal(allocations.get(g.id, 0)) for g in active_goals), Decimal("0"))
    active_remaining = sum((max(Decimal(g.target_amount) - Decimal(allocations.get(g.id, 0)), Decimal("0")) for g in active_goals), Decimal("0"))
    overall_progress = (active_saved / total_target * Decimal("100")) if total_target > 0 else Decimal("0")

    return Response({
        "period": {
            "type": period,
            "month": month,
            "year": year,
            "start_date": start_date,
            "end_date": end_date,
        },
        "period_income": income,
        "period_expense": expense,
        "period_net_savings": net,
        # Backward-compatible names now correctly represent the selected period.
        "total_saved": net,
        "total_target": total_target,
        "allocated_to_active_goals": active_saved,
        "remaining_amount": active_remaining,
        "unallocated_savings": unallocated,
        "active_goals": len(active_goals),
        "completed_goals": len(completed_goals),
        "overall_progress": round(float(min(max(overall_progress, Decimal("0")), Decimal("100"))), 2),
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def savings_history(request):
    allocations = check_goal_deadlines(request.user)
    goals = SavingsGoal.objects.filter(user=request.user, is_finalized=True).order_by("-finalized_at", "-target_date")
    return Response(SavingsGoalSerializer(goals, many=True, context={"allocations": allocations}).data)
