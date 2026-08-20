from calendar import month_name
from decimal import Decimal

from django.db.models import Sum

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from income.models import Income
from expenses.models import Expense
from budgets.models import Budget
from savings.models import SavingsGoal
from savings.serializers import SavingsGoalSerializer
from notifications.models import Notification


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

    goals = SavingsGoal.objects.filter(user=request.user).order_by("target_date")
    goal_data = SavingsGoalSerializer(goals, many=True).data
    total_savings = sum((float(goal.get("saved_amount") or 0) for goal in goal_data), 0)
    completed_goals = sum(1 for goal in goal_data if goal.get("status") == "Completed")
    unread_notifications = Notification.objects.filter(user=request.user, is_read=False).count()
    recent_alerts = list(
        Notification.objects.filter(user=request.user, is_read=False)
        .values("id", "title", "message", "notification_type", "created_at")[:5]
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

        "recent_transactions": transactions[:10],
        "total_savings": total_savings,
        "savings_goals": goal_data[:5],
        "completed_goals": completed_goals,
        "unread_notifications": unread_notifications,
        "recent_alerts": recent_alerts,

    })

MONTHS = {
    i: month_name[i]
    for i in range(1, 13)
}

CATEGORY_LABELS = dict(
    Expense.CATEGORY_CHOICES
)

SOURCE_LABELS = dict(
    Income.SOURCE_CHOICES
)


def validate_month_year(month_value, year_value):

    try:
        month = int(month_value)
        year = int(year_value)

    except (TypeError, ValueError):

        return None, None

    if month < 1 or month > 12:
        return None, None

    if year < 2000 or year > 2100:
        return None, None

    return month, year


def previous_month(month, year):

    if month == 1:
        return 12, year - 1

    return month - 1, year


def money(value):

    return value or Decimal("0")


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def analytics(request):

    # ----------------------------------------
    # Validate selected period
    # ----------------------------------------

    month, year = validate_month_year(
        request.query_params.get("month"),
        request.query_params.get("year")
    )

    if month is None or year is None:

        return Response(
            {
                "error":
                "month must be 1-12 and year must be between 2000 and 2100."
            },
            status=400
        )

    user = request.user

    # ----------------------------------------
    # Selected month querysets
    # ----------------------------------------

    monthly_income = Income.objects.filter(
        user=user,
        income_date__month=month,
        income_date__year=year
    )

    monthly_expenses = Expense.objects.filter(
        user=user,
        expense_date__month=month,
        expense_date__year=year
    )

    monthly_budgets = Budget.objects.filter(
        user=user,
        month=month,
        year=year
    )

    # ----------------------------------------
    # Basic financial totals
    # ----------------------------------------

    total_income = money(
        monthly_income.aggregate(
            total=Sum("amount")
        )["total"]
    )

    total_expense = money(
        monthly_expenses.aggregate(
            total=Sum("amount")
        )["total"]
    )

    total_budget = money(
        monthly_budgets.aggregate(
            total=Sum("budget_amount")
        )["total"]
    )

    balance = total_income - total_expense

    savings = max(
        balance,
        Decimal("0")
    )

    savings_rate = (
        (savings / total_income) * Decimal("100")
        if total_income > 0
        else Decimal("0")
    )

    remaining_budget = max(
        total_budget - total_expense,
        Decimal("0")
    )

    overspent = max(
        total_expense - total_budget,
        Decimal("0")
    )

    budget_utilization = (
        (total_expense / total_budget) * Decimal("100")
        if total_budget > 0
        else Decimal("0")
    )

    # ----------------------------------------
    # Expense by category
    # ----------------------------------------

    category_rows = (
        monthly_expenses
        .values("category")
        .annotate(total=Sum("amount"))
        .order_by("-total")
    )

    expense_by_category = []

    for row in category_rows:

        amount = money(row["total"])

        percentage = (
            (amount / total_expense) * Decimal("100")
            if total_expense > 0
            else Decimal("0")
        )

        expense_by_category.append(
            {
                "category": row["category"],
                "label": CATEGORY_LABELS.get(
                    row["category"],
                    row["category"]
                ),
                "amount": amount,
                "percentage": round(
                    float(percentage),
                    2
                )
            }
        )

    # ----------------------------------------
    # Income by source
    # ----------------------------------------

    source_rows = (
        monthly_income
        .values("source")
        .annotate(total=Sum("amount"))
        .order_by("-total")
    )

    income_by_source = []

    for row in source_rows:

        amount = money(row["total"])

        percentage = (
            (amount / total_income) * Decimal("100")
            if total_income > 0
            else Decimal("0")
        )

        income_by_source.append(
            {
                "source": row["source"],
                "label": SOURCE_LABELS.get(
                    row["source"],
                    row["source"]
                ),
                "amount": amount,
                "percentage": round(
                    float(percentage),
                    2
                )
            }
        )

    # ----------------------------------------
    # Budget utilization
    # ----------------------------------------

    expense_totals = {
        row["category"]: money(row["total"])
        for row in category_rows
    }

    budget_utilization_data = []

    for budget in monthly_budgets:

        spent = expense_totals.get(
            budget.category,
            Decimal("0")
        )

        utilization = (
            (spent / budget.budget_amount) * Decimal("100")
            if budget.budget_amount > 0
            else Decimal("0")
        )

        if spent > budget.budget_amount:
            status = "OVER_BUDGET"

        elif utilization >= 90:
            status = "CRITICAL"

        elif utilization >= 80:
            status = "WARNING"

        else:
            status = "NORMAL"

        budget_utilization_data.append(
            {
                "category": budget.category,
                "label": CATEGORY_LABELS.get(
                    budget.category,
                    budget.category
                ),
                "budget": budget.budget_amount,
                "spent": spent,
                "remaining": max(
                    budget.budget_amount - spent,
                    Decimal("0")
                ),
                "utilization": round(
                    float(utilization),
                    2
                ),
                "status": status
            }
        )

    budget_utilization_data.sort(
        key=lambda item: item["utilization"],
        reverse=True
    )

    # ----------------------------------------
    # Six-month trend
    # ----------------------------------------

    trend_periods = []

    current_month = month
    current_year = year

    for _ in range(6):

        trend_periods.append(
            (
                current_month,
                current_year
            )
        )

        current_month, current_year = previous_month(
            current_month,
            current_year
        )

    trend_periods.reverse()

    monthly_trend = []

    for trend_month, trend_year in trend_periods:

        income_total = money(
            Income.objects.filter(
                user=user,
                income_date__month=trend_month,
                income_date__year=trend_year
            ).aggregate(
                total=Sum("amount")
            )["total"]
        )

        expense_total = money(
            Expense.objects.filter(
                user=user,
                expense_date__month=trend_month,
                expense_date__year=trend_year
            ).aggregate(
                total=Sum("amount")
            )["total"]
        )

        monthly_trend.append(
            {
                "month": trend_month,
                "year": trend_year,
                "label":
                    f"{MONTHS[trend_month][:3]} "
                    f"{str(trend_year)[2:]}",
                "income": income_total,
                "expense": expense_total,
                "savings": max(
                    income_total - expense_total,
                    Decimal("0")
                )
            }
        )

    average_monthly_expense = (
        sum(
            item["expense"]
            for item in monthly_trend
        ) / Decimal("6")
    )

    # ----------------------------------------
    # Savings analytics
    # ----------------------------------------

    all_income = money(
        Income.objects.filter(
            user=user
        ).aggregate(
            total=Sum("amount")
        )["total"]
    )

    all_expense = money(
        Expense.objects.filter(
            user=user
        ).aggregate(
            total=Sum("amount")
        )["total"]
    )

    total_saved = max(
        all_income - all_expense,
        Decimal("0")
    )

    goals = SavingsGoal.objects.filter(
        user=user
    ).order_by("target_date")

    savings_goals = []

    for goal in goals:

        target = goal.target_amount

        progress = (
            min(
                (total_saved / target) * Decimal("100"),
                Decimal("100")
            )
            if target > 0
            else Decimal("0")
        )

        savings_goals.append(
            {
                "id": goal.id,
                "name": goal.goal_name,
                "target_amount": target,
                "saved_amount": total_saved,
                "remaining_amount": max(
                    target - total_saved,
                    Decimal("0")
                ),
                "progress": round(
                    float(progress),
                    2
                ),
                "target_date": goal.target_date,
                "status":
                    "Completed"
                    if progress >= 100
                    else "In Progress"
            }
        )

    total_target = sum(
        (
            goal.target_amount
            for goal in goals
        ),
        Decimal("0")
    )

    overall_goal_progress = (
        min(
            (total_saved / total_target) * Decimal("100"),
            Decimal("100")
        )
        if total_target > 0
        else Decimal("0")
    )

    # ----------------------------------------
    # Financial insights
    # ----------------------------------------

    insights = []

    if total_income == 0 and total_expense == 0:

        insights.append(
            "No financial activity recorded "
            "for the selected month."
        )

    if total_income > 0:

        if total_expense > total_income:

            insights.append(
                "Your expenses are higher than "
                "your income this month."
            )

        elif savings_rate >= 20:

            insights.append(
                f"You saved {round(float(savings_rate), 1)}% "
                "of your income this month."
            )

        else:

            insights.append(
                "Your savings rate is below 20%. "
                "Consider reviewing non-essential spending."
            )

    if expense_by_category:

        highest = expense_by_category[0]

        insights.append(
            f"{highest['label']} is your highest "
            f"spending category at ₹{highest['amount']}."
        )

    if overspent > 0:

        insights.append(
            f"You are over your total budget "
            f"by ₹{overspent}."
        )

    elif total_budget > 0 and budget_utilization >= 80:

        insights.append(
            f"You have used "
            f"{round(float(budget_utilization), 1)}% "
            "of your monthly budget."
        )

    # ----------------------------------------
    # Response
    # ----------------------------------------

    return Response(
        {
            "period": {
                "month": month,
                "year": year,
                "month_name": MONTHS[month]
            },

            "summary": {
                "total_income": total_income,
                "total_expense": total_expense,
                "total_budget": total_budget,
                "balance": balance,
                "savings": savings,
                "savings_rate": round(
                    float(savings_rate),
                    2
                ),
                "remaining_budget": remaining_budget,
                "overspent": overspent,
                "budget_utilization": round(
                    float(budget_utilization),
                    2
                ),
                "average_monthly_expense":
                    average_monthly_expense,
                "transaction_count":
                    monthly_income.count()
                    + monthly_expenses.count()
            },

            "expense_by_category":
                expense_by_category,

            "income_by_source":
                income_by_source,

            "budget_utilization":
                budget_utilization_data,

            "monthly_trend":
                monthly_trend,

            "savings_goals":
                savings_goals,

            "savings_overview": {
                "total_target": total_target,
                "total_saved": total_saved,
                "overall_progress":
                    round(
                        float(overall_goal_progress),
                        2
                    ),
                "active_goals":
                    sum(
                        1
                        for goal in savings_goals
                        if goal["status"] == "In Progress"
                    ),
                "completed_goals":
                    sum(
                        1
                        for goal in savings_goals
                        if goal["status"] == "Completed"
                    )
            },

            "insights": insights
        }
    )