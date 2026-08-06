from datetime import date, timedelta
from django.db.models import Sum

from income.models import Income
from expenses.models import Expense
from budgets.models import Budget
from savings.models import SavingsGoal
from savings.serializers import SavingsGoalSerializer

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

        start_date = today - timedelta(days=7)

    elif filter_type == "last_30_days":

        end_date = today

        start_date = today - timedelta(days=30)

    else:

        start_date = request.GET.get("start_date")

        end_date = request.GET.get("end_date")

    return start_date, end_date

def build_report(request, start_date, end_date):

    incomes = Income.objects.filter(
        user=request.user,
        income_date__range=[start_date, end_date]
    )

    expenses = Expense.objects.filter(
        user=request.user,
        expense_date__range=[start_date, end_date]
    )

    total_income = (
        incomes.aggregate(total=Sum("amount"))["total"] or 0
    )

    total_expense = (
        expenses.aggregate(total=Sum("amount"))["total"] or 0
    )

    current_balance = total_income - total_expense

    total_budget = (
        Budget.objects.filter(
            user=request.user
        ).aggregate(
            total=Sum("budget_amount")
        )["total"] or 0
    )

    remaining_budget = max(
        total_budget - total_expense,
        0
    )

    goals = SavingsGoal.objects.filter(
        user=request.user
    )

    serializer = SavingsGoalSerializer()

    active_goals = 0
    completed_goals = 0

    for goal in goals:

        progress = serializer.get_progress_percentage(goal)

        if progress >= 100:
            completed_goals += 1
        else:
            active_goals += 1

    highest_category = (
        Expense.objects.filter(
            user=request.user,
            expense_date__range=[start_date, end_date]
        )
        .values("category")
        .annotate(total=Sum("amount"))
        .order_by("-total")
        .first()
    )  

    if highest_category:
        highest_expense_category = highest_category["category"]
    else:
        highest_expense_category = "No Expenses"


    budget_status = (
        "Within Budget"
        if total_expense <= remaining_budget
        else "Over Budget"
    )

    savings_status = (
        "On Track"
        if completed_goals > 0
        else "Needs Improvement"
    )


    expense_by_category = list(

        Expense.objects.filter(
            user=request.user,
            expense_date__range=[start_date, end_date]
        )
        .values("category")
        .annotate(total=Sum("amount"))
        .order_by("-total")

    )


    income_vs_expense = {

        "income": total_income,

        "expense": total_expense,

    }


    expense_transactions = Expense.objects.filter(
        user=request.user,
        expense_date__range=[start_date, end_date]
    ).count()


    savings_rate = (
        round((current_balance / total_income) * 100, 2)
        if total_income > 0
        else 0
    )


    budget_utilization = (
        round((total_expense / total_budget) * 100, 2)
        if total_budget > 0
        else 0
    )


    goal_completion_rate = (
        round(
            (completed_goals / goals.count()) * 100,
            2
        )
        if goals.exists()
        else 0
    )


    report = {

        "report_period": {

            "start_date": start_date,

            "end_date": end_date,

        },

        "summary": {

            "total_income": total_income,

            "total_expense": total_expense,

            "current_balance": current_balance,

            "total_savings": current_balance,

        },

        "budget": {

            "total_budget": total_budget,

            "remaining_budget": remaining_budget,

        },

        "savings": {

            "total_savings": current_balance,

            "active_goals": active_goals,

            "completed_goals": completed_goals,

        },

        "insights": {

            "highest_expense_category": highest_expense_category,

            "budget_status": budget_status,

            "savings_status": savings_status,

        },

        "analytics": {

            "expense_transactions": expense_transactions,

            "savings_rate": savings_rate,

            "budget_utilization": budget_utilization,

            "goal_completion_rate": goal_completion_rate,

        },

        "charts": {

            "expense_by_category": expense_by_category,

            "income_vs_expense": income_vs_expense,

            "budget_vs_expense": {

                "budget": total_budget,

                "expense": total_expense,

            },

        },

    }

    return report