from calendar import month_name, monthrange
from datetime import date
from decimal import Decimal

from django.db import transaction
from django.db.models import Q, Sum

from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError

from budgets.utils import recalculate_budget_alert

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from income.models import Income
from expenses.models import Expense
from budgets.models import Budget
from savings.models import SavingsGoal
from savings.serializers import SavingsGoalSerializer
from savings.services import refresh_goal_allocations
from notifications.models import Notification
from dashboard.services import period_querysets, parse_period_params



def _period_label(period, month=None, year=None, start_date=None, end_date=None):
    if period == "month":
        return {
            "type": "month",
            "month": month,
            "year": year,
            "month_name": MONTHS[month],
        }
    if period == "custom":
        return {
            "type": "custom",
            "start_date": start_date,
            "end_date": end_date,
        }
    return {
        "type": "lifetime",
        "start_date": None,
        "end_date": None,
    }


def _month_sequence(start_date, end_date):
    periods = []
    cursor = date(start_date.year, start_date.month, 1)
    last = date(end_date.year, end_date.month, 1)

    while cursor <= last:
        periods.append((cursor.month, cursor.year))
        if cursor.month == 12:
            cursor = date(cursor.year + 1, 1, 1)
        else:
            cursor = date(cursor.year, cursor.month + 1, 1)

    return periods


def _lifetime_month_range(user):
    dates = list(
        Income.objects.filter(user=user).values_list("income_date", flat=True)
    ) + list(
        Expense.objects.filter(user=user).values_list("expense_date", flat=True)
    )

    if not dates:
        today = date.today().replace(day=1)
        return today, today

    return min(dates).replace(day=1), max(dates).replace(day=1)


def _trend_for_period(user, period, month, year, start_date, end_date, incomes, expenses):
    """Return a trend appropriate to the selected period."""
    if period == "month":
        periods = []
        current_month, current_year = month, year
        for _ in range(6):
            periods.append((current_month, current_year))
            if current_month == 1:
                current_month, current_year = 12, current_year - 1
            else:
                current_month -= 1
        periods.reverse()
    elif period == "custom":
        periods = _month_sequence(start_date, end_date)
    else:
        first, last = _lifetime_month_range(user)
        periods = _month_sequence(first, last)

    trend = []
    for trend_month, trend_year in periods:
        month_start = date(trend_year, trend_month, 1)
        month_end = date(
            trend_year,
            trend_month,
            monthrange(trend_year, trend_month)[1],
        )

        if period == "custom":
            bucket_start = max(start_date, month_start)
            bucket_end = min(end_date, month_end)
            income_total = money(
                incomes.filter(
                    income_date__range=(bucket_start, bucket_end)
                ).aggregate(total=Sum("amount"))["total"]
            )
            expense_total = money(
                expenses.filter(
                    expense_date__range=(bucket_start, bucket_end)
                ).aggregate(total=Sum("amount"))["total"]
            )
        elif period == "month":
            income_total = money(
                Income.objects.filter(
                    user=user,
                    income_date__month=trend_month,
                    income_date__year=trend_year,
                ).aggregate(total=Sum("amount"))["total"]
            )
            expense_total = money(
                Expense.objects.filter(
                    user=user,
                    expense_date__month=trend_month,
                    expense_date__year=trend_year,
                ).aggregate(total=Sum("amount"))["total"]
            )
        else:
            income_total = money(
                incomes.filter(
                    income_date__month=trend_month,
                    income_date__year=trend_year,
                ).aggregate(total=Sum("amount"))["total"]
            )
            expense_total = money(
                expenses.filter(
                    expense_date__month=trend_month,
                    expense_date__year=trend_year,
                ).aggregate(total=Sum("amount"))["total"]
            )

        trend.append(
            {
                "month": trend_month,
                "year": trend_year,
                "label": f"{MONTHS[trend_month][:3]} {str(trend_year)[2:]}",
                "income": income_total,
                "expense": expense_total,
                "savings": max(income_total - expense_total, Decimal("0")),
            }
        )

    return trend


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard_summary(request):
    """Return the existing dashboard data for the selected period."""
    try:
        period, month, year, start_date, end_date = parse_period_params(
            request.query_params
        )
        incomes, expenses, budgets = period_querysets(
            request.user,
            period,
            month,
            year,
            start_date,
            end_date,
        )
    except ValueError as exc:
        return Response({"error": str(exc)}, status=400)

    total_income = money(incomes.aggregate(total=Sum("amount"))["total"])
    total_expense = money(expenses.aggregate(total=Sum("amount"))["total"])
    total_budget = money(budgets.aggregate(total=Sum("budget_amount"))["total"])

    current_balance = total_income - total_expense
    remaining_budget = total_budget - total_expense
    overspent_amount = max(-remaining_budget, Decimal("0"))
    remaining_budget = max(remaining_budget, Decimal("0"))

    transactions = []
    for income in incomes.order_by("-income_date", "-id")[:10]:
        transactions.append({
            "type": "Income",
            "category": income.source,
            "amount": income.amount,
            "date": income.income_date,
        })
    for expense in expenses.order_by("-expense_date", "-id")[:10]:
        transactions.append({
            "type": "Expense",
            "category": expense.category,
            "amount": expense.amount,
            "date": expense.expense_date,
        })
    transactions.sort(key=lambda item: item["date"], reverse=True)

    allocations, unallocated_savings = refresh_goal_allocations(request.user)
    goals = SavingsGoal.objects.filter(
        user=request.user
    ).order_by("is_finalized", "target_date", "-target_amount")
    goal_data = SavingsGoalSerializer(
        goals,
        many=True,
        context={"allocations": allocations},
    ).data

    total_savings = max(current_balance, Decimal("0"))
    completed_goals = sum(
        1 for goal in goal_data if goal.get("status") == "Completed"
    )

    unread_notifications = Notification.objects.filter(
        user=request.user,
        is_read=False,
    ).count()

    recent_alerts = list(
        Notification.objects.filter(
            user=request.user,
            is_read=False,
        ).values(
            "id",
            "title",
            "message",
            "notification_type",
            "created_at",
        )[:5]
    )

    return Response({
        # Backward-compatible month/year fields.
        "month": month,
        "year": year,
        "period": _period_label(
            period, month, year, start_date, end_date
        ),
        "total_income": total_income,
        "total_expense": total_expense,
        "total_budget": total_budget,
        "current_balance": current_balance,
        "remaining_budget": remaining_budget,
        "overspent_amount": overspent_amount,
        "recent_transactions": transactions[:10],
        "total_savings": total_savings,
        "unallocated_savings": unallocated_savings,
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

    if not 1 <= month <= 12:
        return None, None

    if not 2000 <= year <= 2100:
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
    """Return the existing analytics for month, custom, or lifetime periods."""
    try:
        period, month, year, start_date, end_date = parse_period_params(
            request.query_params
        )
        incomes, expenses, budgets = period_querysets(
            request.user,
            period,
            month,
            year,
            start_date,
            end_date,
        )
    except ValueError as exc:
        return Response({"error": str(exc)}, status=400)

    user = request.user

    total_income = money(incomes.aggregate(total=Sum("amount"))["total"])
    total_expense = money(expenses.aggregate(total=Sum("amount"))["total"])
    total_budget = money(budgets.aggregate(total=Sum("budget_amount"))["total"])

    balance = total_income - total_expense
    savings = max(balance, Decimal("0"))

    savings_rate = (
        (savings / total_income) * Decimal("100")
        if total_income > 0 else Decimal("0")
    )

    remaining_budget = max(
        total_budget - total_expense,
        Decimal("0"),
    )
    overspent = max(
        total_expense - total_budget,
        Decimal("0"),
    )
    budget_utilization = (
        (total_expense / total_budget) * Decimal("100")
        if total_budget > 0 else Decimal("0")
    )

    category_rows = (
        expenses
        .values("category")
        .annotate(total=Sum("amount"))
        .order_by("-total")
    )

    expense_by_category = []
    for row in category_rows:
        amount = money(row["total"])
        percentage = (
            (amount / total_expense) * Decimal("100")
            if total_expense > 0 else Decimal("0")
        )
        expense_by_category.append({
            "category": row["category"],
            "label": CATEGORY_LABELS.get(
                row["category"], row["category"]
            ),
            "amount": amount,
            "percentage": round(float(percentage), 2),
        })

    source_rows = (
        incomes
        .values("source")
        .annotate(total=Sum("amount"))
        .order_by("-total")
    )

    income_by_source = []
    for row in source_rows:
        amount = money(row["total"])
        percentage = (
            (amount / total_income) * Decimal("100")
            if total_income > 0 else Decimal("0")
        )
        income_by_source.append({
            "source": row["source"],
            "label": SOURCE_LABELS.get(
                row["source"], row["source"]
            ),
            "amount": amount,
            "percentage": round(float(percentage), 2),
        })

    expense_totals = {
        row["category"]: money(row["total"])
        for row in category_rows
    }

    budget_utilization_data = []
    for budget in budgets.order_by("category", "id"):
        spent = expense_totals.get(
            budget.category,
            Decimal("0"),
        )
        utilization = (
            (spent / budget.budget_amount) * Decimal("100")
            if budget.budget_amount > 0 else Decimal("0")
        )

        if spent > budget.budget_amount:
            status = "OVER_BUDGET"
        elif utilization >= 90:
            status = "CRITICAL"
        elif utilization >= 80:
            status = "WARNING"
        else:
            status = "NORMAL"

        budget_utilization_data.append({
            "category": budget.category,
            "label": CATEGORY_LABELS.get(
                budget.category, budget.category
            ),
            "budget": budget.budget_amount,
            "spent": spent,
            "remaining": max(
                budget.budget_amount - spent,
                Decimal("0"),
            ),
            "utilization": round(float(utilization), 2),
            "status": status,
        })

    budget_utilization_data.sort(
        key=lambda item: item["utilization"],
        reverse=True,
    )

    monthly_trend = _trend_for_period(
        user,
        period,
        month,
        year,
        start_date,
        end_date,
        incomes,
        expenses,
    )

    average_monthly_expense = (
        sum(
            (item["expense"] for item in monthly_trend),
            Decimal("0"),
        ) / Decimal(len(monthly_trend))
        if monthly_trend
        else Decimal("0")
    )

    # Savings goals remain their current lifecycle state; the financial
    # summary above is strictly scoped to the selected period.
    all_income = money(
        Income.objects.filter(user=user)
        .aggregate(total=Sum("amount"))["total"]
    )
    all_expense = money(
        Expense.objects.filter(user=user)
        .aggregate(total=Sum("amount"))["total"]
    )
    total_saved = max(
        all_income - all_expense,
        Decimal("0"),
    )

    allocations, _ = refresh_goal_allocations(user)
    goals = SavingsGoal.objects.filter(
        user=user
    ).order_by("is_finalized", "target_date", "-target_amount")

    savings_goals = []
    active_targets = Decimal("0")
    active_saved = Decimal("0")

    for goal in goals:
        target = goal.target_amount
        saved = (
            Decimal(goal.finalized_amount or 0)
            if goal.is_finalized
            else Decimal(allocations.get(goal.id, 0))
        )
        progress = (
            min(
                (saved / target) * Decimal("100"),
                Decimal("100"),
            )
            if target > 0 else Decimal("0")
        )

        if goal.is_active and not goal.is_finalized:
            active_targets += target
            active_saved += saved

        savings_goals.append({
            "id": goal.id,
            "name": goal.goal_name,
            "target_amount": target,
            "saved_amount": saved,
            "remaining_amount": max(
                target - saved,
                Decimal("0"),
            ),
            "progress": round(float(progress), 2),
            "target_date": goal.target_date,
            "status": (
                "Completed"
                if goal.is_finalized
                else "In Progress"
                if goal.is_active
                else "Paused"
            ),
        })

    total_target = active_targets
    overall_goal_progress = (
        active_saved / total_target * Decimal("100")
        if total_target > 0 else Decimal("0")
    )

    insights = []

    if total_income == 0 and total_expense == 0:
        insights.append(
            "No financial activity recorded for the selected period."
        )

    if total_income > 0:
        if total_expense > total_income:
            insights.append(
                "Your expenses are higher than your income for the selected period."
            )
        elif savings_rate >= 20:
            insights.append(
                f"You saved {round(float(savings_rate), 1)}% "
                "of your income for the selected period."
            )
        else:
            insights.append(
                "Your savings rate is below 20%. "
                "Consider reviewing non-essential spending."
            )

    if expense_by_category:
        highest = expense_by_category[0]
        insights.append(
            f"{highest['label']} is your highest spending category "
            f"at ₹{highest['amount']}."
        )

    if overspent > 0:
        insights.append(
            f"You are over the selected budget by ₹{overspent}."
        )
    elif total_budget > 0 and budget_utilization >= 80:
        insights.append(
            f"You have used {round(float(budget_utilization), 1)}% "
            "of the selected budget."
        )

    return Response({
        "period": _period_label(
            period, month, year, start_date, end_date
        ),
        "summary": {
            "total_income": total_income,
            "total_expense": total_expense,
            "total_budget": total_budget,
            "balance": balance,
            "savings": savings,
            "savings_rate": round(float(savings_rate), 2),
            "remaining_budget": remaining_budget,
            "overspent": overspent,
            "budget_utilization": round(
                float(budget_utilization), 2
            ),
            "average_monthly_expense": average_monthly_expense,
            "transaction_count": incomes.count() + expenses.count(),
        },
        "expense_by_category": expense_by_category,
        "income_by_source": income_by_source,
        "budget_utilization": budget_utilization_data,
        "monthly_trend": monthly_trend,
        "savings_goals": savings_goals,
        "savings_overview": {
            "total_target": total_target,
            "total_saved": total_saved,
            "overall_progress": round(
                float(overall_goal_progress), 2
            ),
            "active_goals": sum(
                1 for goal in savings_goals
                if goal["status"] == "In Progress"
            ),
            "completed_goals": sum(
                1 for goal in savings_goals
                if goal["status"] == "Completed"
            ),
        },
        "insights": insights,
    })

# Patch Work 2: consequence-aware deletion and user-scoped bulk deletion.
# Kept in the existing dashboard views module to preserve the project architecture.
MODELS = {
    "income": Income,
    "expense": Expense,
    "budget": Budget,
    "savings": SavingsGoal,
    "notification": Notification,
}


class DeletionImpactView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        resource = request.query_params.get("resource")
        raw_ids = request.query_params.get("ids", "")
        if resource not in MODELS or not raw_ids.strip():
            raise ValidationError({"error": "resource and comma-separated ids are required."})
        try:
            ids = [int(value.strip()) for value in raw_ids.split(",") if value.strip()]
        except (TypeError, ValueError):
            raise ValidationError({"error": "ids must contain numeric values."})
        if not ids:
            raise ValidationError({"error": "At least one id is required."})
        from .services import deletion_impact
        return Response(deletion_impact(request.user, resource, ids))


class BulkDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        resource = request.data.get("resource")
        ids = request.data.get("ids", [])
        if resource not in MODELS:
            raise ValidationError({"error": "Unsupported resource."})
        if not isinstance(ids, list) or not ids:
            raise ValidationError({"error": "resource and a non-empty ids list are required."})
        try:
            ids = [int(value) for value in ids]
        except (TypeError, ValueError):
            raise ValidationError({"error": "ids must contain numeric values."})

        model = MODELS[resource]
        with transaction.atomic():
            queryset = model.objects.filter(user=request.user, id__in=ids)
            deleted_count = queryset.count()
            if deleted_count == 0:
                return Response({"deleted": 0, "deleted_budgets": 0, "deleted_expenses": 0})

            deleted_budget_count = 0
            deleted_expense_count = 0

            if resource == "budget":
                from .services import delete_budget_with_dependencies
                deleted_budget_count, deleted_expense_count = delete_budget_with_dependencies(
                    request.user, queryset
                )
            elif resource == "income":
                from .services import delete_income_with_dependencies
                deleted_count, deleted_budget_count, deleted_expense_count = delete_income_with_dependencies(
                    request.user, queryset
                )
            else:
                queryset.delete()

            if resource in {"income", "expense", "budget", "savings"}:
                refresh_goal_allocations(request.user, notify=False)
            if resource in {"income", "expense", "budget"}:
                for budget in Budget.objects.filter(user=request.user):
                    recalculate_budget_alert(request.user, budget)

        return Response(
            {
                "deleted": deleted_count,
                "deleted_budgets": deleted_budget_count,
                "deleted_expenses": deleted_expense_count,
            },
            status=200,
        )