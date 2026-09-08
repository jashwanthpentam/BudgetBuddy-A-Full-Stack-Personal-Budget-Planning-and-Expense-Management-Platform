from collections import defaultdict
from datetime import date
from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone

from income.models import Income
from expenses.models import Expense
from notifications.models import Notification
from notifications.utils import create_notification

ZERO = Decimal("0")


def money(value):
    return Decimal(value or ZERO)


def lifetime_balance(user):
    income = money(Income.objects.filter(user=user).aggregate(total=Sum("amount"))["total"])
    expense = money(Expense.objects.filter(user=user).aggregate(total=Sum("amount"))["total"])
    return max(income - expense, ZERO)


def period_totals(user, period="month", month=None, year=None, start_date=None, end_date=None):
    income_qs = Income.objects.filter(user=user)
    expense_qs = Expense.objects.filter(user=user)

    if period == "month":
        if not month or not year:
            raise ValueError("month and year are required for month period")
        income_qs = income_qs.filter(income_date__month=month, income_date__year=year)
        expense_qs = expense_qs.filter(expense_date__month=month, expense_date__year=year)
    elif period == "custom":
        if not start_date or not end_date:
            raise ValueError("start_date and end_date are required for custom period")
        income_qs = income_qs.filter(income_date__range=(start_date, end_date))
        expense_qs = expense_qs.filter(expense_date__range=(start_date, end_date))
    elif period != "lifetime":
        raise ValueError("period must be month, custom, or lifetime")

    income = money(income_qs.aggregate(total=Sum("amount"))["total"])
    expense = money(expense_qs.aggregate(total=Sum("amount"))["total"])
    return income, expense, income - expense


def _completion_message(goal):
    return f"Your savings goal '{goal.goal_name}' has been finalized at ₹{goal.finalized_amount}."


def _deadline_message(goal):
    return f"Your active savings goal '{goal.goal_name}' is due on {goal.target_date.strftime('%d %B %Y')}."


def _notify_once(user, title, message):
    if Notification.objects.filter(user=user, notification_type="saving", title=title, message=message).exists():
        return
    create_notification(user=user, title=title, message=message, notification_type="saving")


def refresh_goal_allocations(user, notify=True):
    """Allocate available lifetime savings across active goals.

    Allocation is deterministic: earlier target dates first, then higher targets.
    Finalized goals are frozen and reserve their finalized amount. Active allocations
    are recalculated whenever income, expenses, goals, or goal settings change.
    """
    from .models import SavingsGoal

    goals = list(SavingsGoal.objects.filter(user=user).order_by("target_date", "-target_amount", "created_at", "id"))
    frozen_total = sum((money(g.finalized_amount) for g in goals if g.is_finalized), ZERO)
    available = max(lifetime_balance(user) - frozen_total, ZERO)
    allocations = defaultdict(lambda: ZERO)

    for goal in goals:
        if goal.is_finalized:
            allocations[goal.id] = min(money(goal.finalized_amount), money(goal.target_amount))
            continue
        if not goal.is_active:
            continue

        target = money(goal.target_amount)
        allocated = min(target, available)
        allocations[goal.id] = allocated
        available -= allocated

        if allocated >= target and target > ZERO:
            goal.is_finalized = True
            goal.is_active = False
            goal.finalized_amount = target
            goal.finalized_at = timezone.now()
            goal.status = "Completed"
            goal.save(update_fields=["is_finalized", "is_active", "finalized_amount", "finalized_at", "status", "updated_at"])
            allocations[goal.id] = target
            if notify:
                _notify_once(user, "Savings Goal Finalized", _completion_message(goal))
        else:
            if goal.status != "In Progress":
                goal.status = "In Progress"
                goal.save(update_fields=["status", "updated_at"])

    return dict(allocations), available


def check_goal_deadlines(user, notify=True):
    from .models import SavingsGoal

    today = date.today()
    allocations, _ = refresh_goal_allocations(user, notify=notify)
    for goal in SavingsGoal.objects.filter(user=user, is_active=True, is_finalized=False):
        days_remaining = (goal.target_date - today).days
        if 0 <= days_remaining <= 7 and notify:
            _notify_once(user, "Savings Goal Deadline", _deadline_message(goal))
    return allocations
