from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from income.models import Income
from rest_framework.exceptions import ValidationError
from .models import Budget
from .serializers import BudgetSerializer
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db.models import Sum
from rest_framework.decorators import api_view, permission_classes

from expenses.models import Expense

class BudgetViewSet(viewsets.ModelViewSet):
    serializer_class = BudgetSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Budget.objects.filter(user=self.request.user)

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

        serializer.save(user=self.request.user)

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

        serializer.save()



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