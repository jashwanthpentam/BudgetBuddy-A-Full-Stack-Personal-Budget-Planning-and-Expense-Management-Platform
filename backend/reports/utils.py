from calendar import monthrange
from datetime import date, datetime, timedelta
from decimal import Decimal

from django.db.models import Sum

from budgets.models import Budget
from expenses.models import Expense
from income.models import Income
from savings.models import SavingsGoal
from savings.serializers import SavingsGoalSerializer


def _parse_date(value):
    if not value:
        return None
    if isinstance(value, date):
        return value
    try:
        return datetime.strptime(str(value), "%Y-%m-%d").date()
    except (TypeError, ValueError):
        return None


def get_date_range(request):
    filter_type = request.GET.get("filter")
    today = date.today()

    if filter_type == "current_month":
        start_date = today.replace(day=1)
        end_date = today
    elif filter_type == "previous_month":
        first_day = today.replace(day=1)
        end_date = first_day - timedelta(days=1)
        start_date = end_date.replace(day=1)
    elif filter_type == "last_7_days":
        end_date = today
        start_date = today - timedelta(days=6)
    elif filter_type == "last_30_days":
        end_date = today
        start_date = today - timedelta(days=29)
    else:
        start_date = _parse_date(request.GET.get("start_date"))
        end_date = _parse_date(request.GET.get("end_date"))

    return start_date, end_date


def _budget_queryset_for_period(user, start_date, end_date):
    """Return budgets whose month falls inside the selected date range."""
    months = []
    cursor = date(start_date.year, start_date.month, 1)
    last = date(end_date.year, end_date.month, 1)

    while cursor <= last:
        months.append((cursor.month, cursor.year))
        if cursor.month == 12:
            cursor = date(cursor.year + 1, 1, 1)
        else:
            cursor = date(cursor.year, cursor.month + 1, 1)

    from django.db.models import Q
    query = Q()
    for month, year in months:
        query |= Q(month=month, year=year)

    return Budget.objects.filter(user=user).filter(query) if months else Budget.objects.none()


def build_report(request, start_date, end_date):
    if not start_date or not end_date:
        raise ValueError("A valid start_date and end_date are required.")
    if end_date < start_date:
        raise ValueError("end_date must be greater than or equal to start_date.")

    user = request.user

    incomes = Income.objects.filter(
        user=user,
        income_date__range=[start_date, end_date],
    ).order_by("income_date", "id")

    expenses = Expense.objects.filter(
        user=user,
        expense_date__range=[start_date, end_date],
    ).order_by("expense_date", "id")

    total_income = incomes.aggregate(total=Sum("amount"))["total"] or Decimal("0")
    total_expense = expenses.aggregate(total=Sum("amount"))["total"] or Decimal("0")
    current_balance = total_income - total_expense
    total_savings = max(current_balance, Decimal("0"))

    budgets = _budget_queryset_for_period(user, start_date, end_date)
    total_budget = budgets.aggregate(total=Sum("budget_amount"))["total"] or Decimal("0")
    remaining_budget = max(total_budget - total_expense, Decimal("0"))
    overspent_amount = max(total_expense - total_budget, Decimal("0"))

    budget_status = "Over Budget" if overspent_amount > 0 else "Within Budget"
    budget_utilization = (
        (total_expense / total_budget) * Decimal("100")
        if total_budget > 0 else Decimal("0")
    )

    goals = SavingsGoal.objects.filter(user=user).order_by("target_date")
    goal_serializer = SavingsGoalSerializer(goals, many=True)
    goal_rows = goal_serializer.data

    active_goals = sum(1 for goal in goal_rows if goal.get("status") != "Completed")
    completed_goals = sum(1 for goal in goal_rows if goal.get("status") == "Completed")
    goal_completion_rate = (
        Decimal(completed_goals) / Decimal(len(goal_rows)) * Decimal("100")
        if goal_rows else Decimal("0")
    )

    highest_category = (
        expenses.values("category")
        .annotate(total=Sum("amount"))
        .order_by("-total")
        .first()
    )

    expense_by_category = list(
        expenses.values("category")
        .annotate(total=Sum("amount"))
        .order_by("-total")
    )

    income_by_source = list(
        incomes.values("source")
        .annotate(total=Sum("amount"))
        .order_by("-total")
    )

    income_vs_expense = {
        "income": total_income,
        "expense": total_expense,
    }

    expense_transactions = expenses.count()
    income_transactions = incomes.count()
    total_transactions = expense_transactions + income_transactions

    savings_rate = (
        (total_savings / total_income) * Decimal("100")
        if total_income > 0 else Decimal("0")
    )

    return {
        "report_period": {
            "start_date": start_date,
            "end_date": end_date,
        },
        "summary": {
            "total_income": total_income,
            "total_expense": total_expense,
            "current_balance": current_balance,
            "total_savings": total_savings,
        },
        "budget": {
            "total_budget": total_budget,
            "remaining_budget": remaining_budget,
            "overspent_amount": overspent_amount,
        },
        "savings": {
            "total_savings": total_savings,
            "active_goals": active_goals,
            "completed_goals": completed_goals,
            "goals": goal_rows,
        },
        "insights": {
            "highest_expense_category": highest_category["category"] if highest_category else "No Expenses",
            "budget_status": budget_status,
            "savings_status": "On Track" if savings_rate >= 20 or completed_goals > 0 else "Needs Improvement",
        },
        "analytics": {
            "expense_transactions": expense_transactions,
            "income_transactions": income_transactions,
            "total_transactions": total_transactions,
            "savings_rate": round(savings_rate, 2),
            "budget_utilization": round(budget_utilization, 2),
            "goal_completion_rate": round(goal_completion_rate, 2),
        },
        "charts": {
            "expense_by_category": expense_by_category,
            "income_by_source": income_by_source,
            "income_vs_expense": income_vs_expense,
            "budget_vs_expense": {
                "budget": total_budget,
                "expense": total_expense,
            },
        },
        "transactions": {
            "income": list(incomes.values("income_date", "source", "amount", "description")),
            "expenses": list(expenses.values("expense_date", "category", "amount", "description")),
        },
    }
