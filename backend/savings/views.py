from rest_framework import generics, permissions
from .models import SavingsGoal
from .serializers import SavingsGoalSerializer
from rest_framework.generics import RetrieveAPIView
from rest_framework.response import Response
from django.db.models import Sum
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from income.models import Income
from expenses.models import Expense
from notifications.utils import create_notification


class SavingsListCreateView(generics.ListCreateAPIView):

    serializer_class = SavingsGoalSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):

        return SavingsGoal.objects.filter(
            user=self.request.user
        ).order_by("target_date")

    def perform_create(self, serializer):

        goal = serializer.save(user=self.request.user)
        
        create_notification(
        user=self.request.user,
        title="Savings Goal Created",
        message=(
            f"Your savings goal '{goal.goal_name}' "
            "has been created successfully."
        ),
        notification_type="saving",
    )


class SavingsDetailView(
    generics.RetrieveUpdateDestroyAPIView
):

    serializer_class = SavingsGoalSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):

        return SavingsGoal.objects.filter(
            user=self.request.user
        )

    def perform_update(self, serializer):

        serializer.save()

            

class GoalProgressAPIView(RetrieveAPIView):

    serializer_class = SavingsGoalSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SavingsGoal.objects.filter(user=self.request.user)

    def retrieve(self, request, *args, **kwargs):

        goal = self.get_object()

        serializer = SavingsGoalSerializer(goal)

        return Response(serializer.data)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def savings_summary(request):
    goals = SavingsGoal.objects.filter(
        user=request.user
    ).order_by("target_date")

    total_target = goals.aggregate(total=Sum("target_amount"))["total"] or 0

    total_income = (
        Income.objects.filter(user=request.user)
        .aggregate(total=Sum("amount"))["total"] or 0
    )

    total_expense = (
        Expense.objects.filter(user=request.user)
        .aggregate(total=Sum("amount"))["total"] or 0
    )

    total_saved = total_income - total_expense


    active_goals = goals.filter(
        status="In Progress"
    ).count()

    completed_goals = goals.filter(
        status="Completed"
    ).count()

    remaining_amount = max(
        total_target - total_saved,
        0
    )

    overall_progress = (
        (total_saved / total_target) * 100
        if total_target > 0
        else 0
    )

    return Response({
        "total_target": total_target,
        "total_saved": total_saved,
        "remaining_amount": remaining_amount,
        "active_goals": active_goals,
        "completed_goals": completed_goals,
        "overall_progress": round(overall_progress, 2),
    })