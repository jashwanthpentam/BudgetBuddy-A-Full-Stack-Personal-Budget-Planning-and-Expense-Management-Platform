from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from income.models import Income
from rest_framework.exceptions import ValidationError
from .models import Budget
from .serializers import BudgetSerializer
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Sum
from notifications.utils import create_notification
from expenses.models import Expense
from .utils import recalculate_budget_alert

class BudgetViewSet(viewsets.ModelViewSet):
    serializer_class = BudgetSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Budget.objects.filter(
            user=self.request.user
        )

        # Optional period filter for the Budgets page.
        # When month/year are supplied, return only budgets
        # belonging to that selected period.
        month = self.request.query_params.get("month")
        year = self.request.query_params.get("year")

        if month:
            try:
                month = int(month)
                if 1 <= month <= 12:
                    queryset = queryset.filter(month=month)
            except (TypeError, ValueError):
                pass

        if year:
            try:
                year = int(year)
                if year > 0:
                    queryset = queryset.filter(year=year)
            except (TypeError, ValueError):
                pass

        return queryset

    def perform_create(self, serializer):

        month = serializer.validated_data["month"]
        year = serializer.validated_data["year"]
        new_budget = serializer.validated_data["budget_amount"]

        # Total income for this month
        total_income = Income.objects.filter(
            user=self.request.user,
            income_date__month=month,
            income_date__year=year
        ).aggregate(
            total=Sum("amount")
        )["total"] or 0

        if total_income == 0:
            raise ValidationError({
                "error": f"No income found for {month}/{year}. Please add income first."
            })

        # Already allocated budget
        allocated_budget = Budget.objects.filter(
            user=self.request.user,
            month=month,
            year=year
        ).aggregate(
            total=Sum("budget_amount")
        )["total"] or 0

        # Check allocation
        if allocated_budget + new_budget > total_income:

            remaining_income = total_income - allocated_budget

            raise ValidationError({
                "error": (
                    f"Budget exceeds available income.\n\n"
                    f"Total Income : ₹{total_income}\n"
                    f"Allocated : ₹{allocated_budget}\n"
                    f"Remaining : ₹{remaining_income}"
                )
            })

        budget = serializer.save(user=self.request.user)

        create_notification(
            user=self.request.user,
            title="Budget Created",
            message=(
                f"Your {budget.category} budget "
                f"for {budget.month}/{budget.year} "
                "has been created successfully."
            ),
            notification_type="budget",
        )

    

    def perform_update(self, serializer):

        budget = self.get_object()

        month = serializer.validated_data.get("month", budget.month)
        year = serializer.validated_data.get("year", budget.year)
        new_budget = serializer.validated_data.get(
            "budget_amount",
            budget.budget_amount
        )

        total_income = Income.objects.filter(
            user=self.request.user,
            income_date__month=month,
            income_date__year=year
        ).aggregate(
            total=Sum("amount")
        )["total"] or 0

        allocated_budget = Budget.objects.filter(
            user=self.request.user,
            month=month,
            year=year
        ).exclude(
            id=budget.id
        ).aggregate(
            total=Sum("budget_amount")
        )["total"] or 0

        if allocated_budget + new_budget > total_income:

            remaining_income = total_income - allocated_budget

            raise ValidationError({
                "error": (
                    f"Budget exceeds available income.\n\n"
                    f"Total Income : ₹{total_income}\n"
                    f"Allocated : ₹{allocated_budget}\n"
                    f"Remaining : ₹{remaining_income}"
                )
            })

        budget.warning_80_sent = False
        budget.warning_90_sent = False
        budget.warning_100_sent = False
        budget.warning_exceeded_sent = False

        budget = serializer.save()

        recalculate_budget_alert(
                self.request.user,
                budget
            )
        create_notification(
            user=self.request.user,
            title="Budget Updated",
            message=(
                f"Your {budget.category} budget "
                f"for {budget.month}/{budget.year} "
                "has been updated successfully."
            ),
            notification_type="budget",
        )



@api_view(["GET"])
@permission_classes([IsAuthenticated])
def budget_summary(request, budget_id):

    try:
        budget = Budget.objects.get(
            id=budget_id,
            user=request.user
        )
    except Budget.DoesNotExist:
        return Response(
            {"error": "Budget not found"},
            status=404
        )

    total_expense = Expense.objects.filter(
        user=request.user,
        category=budget.category,
        expense_date__month=budget.month,
        expense_date__year=budget.year
    ).aggregate(
        total=Sum("amount")
    )["total"] or 0

    remaining_budget = budget.budget_amount - total_expense

    overspent_amount = 0

    if remaining_budget < 0:
        overspent_amount = abs(remaining_budget)
        remaining_budget = 0

    return Response({
        "budget_amount": budget.budget_amount,
        "total_expense": total_expense,
        "remaining_budget": remaining_budget,
        "overspent_amount": overspent_amount
    })

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def overall_budget_summary(request):

    total_budget = Budget.objects.filter(
        user=request.user
    ).aggregate(
        total=Sum("budget_amount")
    )["total"] or 0

    total_expense = Expense.objects.filter(
        user=request.user
    ).aggregate(
        total=Sum("amount")
    )["total"] or 0

    remaining_budget = total_budget - total_expense

    overspent_amount = 0

    if remaining_budget < 0:
        overspent_amount = abs(remaining_budget)
        remaining_budget = 0

    return Response({

        "total_budget": total_budget,
        "total_expense": total_expense,
        "remaining_budget": remaining_budget,
        "overspent_amount": overspent_amount

    })

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def budget_alert(request, budget_id):

    try:
        budget = Budget.objects.get(
            id=budget_id,
            user=request.user
        )
    except Budget.DoesNotExist:
        return Response(
            {"error": "Budget not found"},
            status=404
        )

    total_expense = Expense.objects.filter(
        user=request.user,
        category=budget.category,
        expense_date__month=budget.month,
        expense_date__year=budget.year
    ).aggregate(
        total=Sum("amount")
    )["total"] or 0

    budget_amount = budget.budget_amount

    remaining_budget = budget_amount - total_expense

    overspent_amount = 0
    if remaining_budget < 0:
        overspent_amount = abs(remaining_budget)
        remaining_budget = 0

    usage_percentage = (
        (total_expense / budget_amount) * 100
        if budget_amount > 0 else 0
    )

    threshold = int(usage_percentage // 10) * 10

    if usage_percentage < 50:
        status = "Safe"
        message = "Your spending is within the budget."

    elif usage_percentage < 75:
        status = "Notify"
        message = (
            f"You have used {round(usage_percentage, 2)}% "
            "of your budget."
        )

    elif usage_percentage < 100:
        status = "Warning"
        message = (
            f"You have used {round(usage_percentage, 2)}% "
            "of your budget. Consider reducing expenses."
        )

    elif 100 <= usage_percentage < 110:
        status = "Exceeded"
        message = "You have reached your budget limit."

    else:
        status = "Exceeded"
        message = (
            f"You have exceeded your budget by ₹{overspent_amount}."
        )

    return Response({
        "budget_amount": budget_amount,
        "total_expense": total_expense,
        "remaining_budget": remaining_budget,
        "overspent_amount": overspent_amount,
        "usage_percentage": round(usage_percentage, 2),
        "threshold": threshold,
        "status": status,
        "message": message
    })