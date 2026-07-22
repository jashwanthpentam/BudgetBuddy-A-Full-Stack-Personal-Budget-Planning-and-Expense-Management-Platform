from decimal import Decimal

from django.db.models import Sum
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from income.models import Income
from expenses.models import Expense
from budgets.models import Budget


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_summary(request):

    month = request.GET.get("month")
    year = request.GET.get("year")

    if not month or not year:
        return Response(
            {"error": "month and year are required"},
            status=400
        )

    month = int(month)
    year = int(year)

    # ---------- Income ----------

    total_income = (
        Income.objects.filter(
            user=request.user,
            income_date__month=month,
            income_date__year=year
        ).aggregate(total=Sum("amount"))["total"]
        or Decimal("0")
    )

    # ---------- Expense ----------

    total_expense = (
        Expense.objects.filter(
            user=request.user,
            expense_date__month=month,
            expense_date__year=year
        ).aggregate(total=Sum("amount"))["total"]
        or Decimal("0")
    )

    # ---------- Budget ----------

    total_budget = (
        Budget.objects.filter(
            user=request.user,
            month=month,
            year=year
        ).aggregate(total=Sum("budget_amount"))["total"]
        or Decimal("0")
    )

    current_balance = total_income - total_expense

    remaining_budget = total_budget - total_expense

    overspent_amount = Decimal("0")

    if remaining_budget < 0:
        overspent_amount = abs(remaining_budget)
        remaining_budget = Decimal("0")

    recent_income = Income.objects.filter(
        user=request.user,
        income_date__month=month,
        income_date__year=year
    )

    recent_expense = Expense.objects.filter(
        user=request.user,
        expense_date__month=month,
        expense_date__year=year
    )

    transactions = []

    for income in recent_income:

        transactions.append({
            "type": "Income",
            "category": income.source,
            "amount": income.amount,
            "date": income.income_date
        })

    for expense in recent_expense:

        transactions.append({
            "type": "Expense",
            "category": expense.category,
            "amount": expense.amount,
            "date": expense.expense_date
        })

    transactions.sort(
        key=lambda x: x["date"],
        reverse=True
    )

    return Response({

        "month": month,
        "year": year,

        "total_income": total_income,
        "total_expense": total_expense,
        "total_budget": total_budget,

        "current_balance": current_balance,

        "remaining_budget": remaining_budget,

        "overspent_amount": overspent_amount,

        "recent_transactions": transactions[:10]

    })