from collections import defaultdict
from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from django.db.models import Sum
from django.utils import timezone

from income.models import Income
from expenses.models import Expense
from notifications.models import Notification
from notifications.utils import create_notification

ZERO = Decimal("0")
CENT = Decimal("0.01")


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
        if month is None or year is None:
            raise ValueError("month and year are required for month period")

        try:
            month = int(month)
            year = int(year)
        except (TypeError, ValueError):
            raise ValueError("month and year must be valid numbers")

        if not 1 <= month <= 12:
            raise ValueError("month must be between 1 and 12")
        if not 2000 <= year <= 2100:
            raise ValueError("year must be between 2000 and 2100")

        income_qs = income_qs.filter(income_date__month=month, income_date__year=year)
        expense_qs = expense_qs.filter(expense_date__month=month, expense_date__year=year)
    elif period == "custom":
        if not start_date or not end_date:
            raise ValueError("start_date and end_date are required for custom period")

        if isinstance(start_date, str):
            try:
                start_date = date.fromisoformat(start_date)
            except ValueError:
                raise ValueError("start_date must be a valid date")
        if isinstance(end_date, str):
            try:
                end_date = date.fromisoformat(end_date)
            except ValueError:
                raise ValueError("end_date must be a valid date")

        if start_date > end_date:
            raise ValueError("start_date cannot be after end_date")

        income_qs = income_qs.filter(income_date__range=(start_date, end_date))
        expense_qs = expense_qs.filter(expense_date__range=(start_date, end_date))
    elif period != "lifetime":
        raise ValueError("period must be month, custom, or lifetime")

    income = money(income_qs.aggregate(total=Sum("amount"))["total"])
    expense = money(expense_qs.aggregate(total=Sum("amount"))["total"])
    return income, expense, income - expense


def _completion_message(goal):
    return (
        f"Your savings goal '{goal.goal_name}' was completed on its target date "
        f"with ₹{goal.finalized_amount}."
    )


def _missed_message(goal):
    return (
        f"Your savings goal '{goal.goal_name}' reached its target date with "
        f"₹{goal.finalized_amount} saved against a ₹{goal.target_amount} target."
    )


def _deadline_message(goal):
    return f"Your active savings goal '{goal.goal_name}' is due on {goal.target_date.strftime('%d %B %Y')}."


def _notify_once(user, title, message):
    if Notification.objects.filter(
        user=user,
        notification_type="saving",
        title=title,
        message=message,
    ).exists():
        return
    create_notification(
        user=user,
        title=title,
        message=message,
        notification_type="saving",
    )


def _priority_weighted_allocations(goals, available):
    """Allocate available savings using the Patch Work 1 priority rule.

    Priority is deterministic and lexicographic:
      1. Earlier target date has higher priority.
      2. For the same target date, the higher target amount has higher priority.
      3. Goal id is only a stable final tie-breaker.

    Priority is converted to descending weights (N, N-1, ..., 1). Savings are
    distributed proportionally to those weights and any goal that reaches its
    target is capped; remaining money is redistributed among the goals that
    still have capacity. This preserves the priority relationship without
    allowing a lower-priority goal's larger target to override an earlier due
    goal.
    """
    allocations = defaultdict(lambda: ZERO)
    goals = sorted(
        list(goals),
        key=lambda goal: (goal.target_date, -money(goal.target_amount), goal.id),
    )
    available = max(money(available), ZERO)

    if not goals or available <= ZERO:
        return dict(allocations), available

    remaining_pool = available
    remaining_goals = goals[:]

    # Re-run weighted distribution after a cap is reached. This is equivalent
    # to weighted water-filling and guarantees that total allocation never
    # exceeds either the available pool or each goal's target.
    while remaining_goals and remaining_pool > ZERO:
        count = len(remaining_goals)
        weights = {
            goal.id: Decimal(count - index)
            for index, goal in enumerate(remaining_goals)
        }
        total_weight = sum(weights.values(), ZERO)
        if total_weight <= ZERO:
            break

        round_allocated = ZERO
        capped_ids = set()

        for goal in remaining_goals:
            target = money(goal.target_amount)
            capacity = max(target - allocations[goal.id], ZERO)
            if capacity <= ZERO:
                capped_ids.add(goal.id)
                continue

            raw = (remaining_pool * weights[goal.id] / total_weight).quantize(
                CENT, rounding=ROUND_HALF_UP
            )
            amount = min(raw, capacity)
            allocations[goal.id] += amount
            round_allocated += amount

            if allocations[goal.id] >= target:
                capped_ids.add(goal.id)

        # Correct cent-level rounding drift among goals with remaining capacity.
        residual = (remaining_pool - round_allocated).quantize(CENT, rounding=ROUND_HALF_UP)
        if residual > ZERO:
            for goal in remaining_goals:
                if residual <= ZERO:
                    break
                capacity = max(money(goal.target_amount) - allocations[goal.id], ZERO)
                if capacity <= ZERO:
                    continue
                step = min(capacity, residual)
                allocations[goal.id] += step
                round_allocated += step
                residual -= step

        if round_allocated <= ZERO:
            break

        remaining_pool = max(remaining_pool - round_allocated, ZERO)
        remaining_goals = [
            goal for goal in remaining_goals
            if goal.id not in capped_ids
            and allocations[goal.id] < money(goal.target_amount)
        ]

    return dict(allocations), remaining_pool


def _current_active_allocations(user):
    from .models import SavingsGoal

    goals = list(
        SavingsGoal.objects.filter(
            user=user,
            is_active=True,
            is_finalized=False,
        ).order_by("target_date", "id")
    )
    frozen_total = sum(
        (money(goal.finalized_amount) for goal in SavingsGoal.objects.filter(user=user, is_finalized=True)),
        ZERO,
    )
    available = max(lifetime_balance(user) - frozen_total, ZERO)
    return goals, available


def refresh_goal_allocations(user, notify=True):
    """Refresh dynamic goal progress and finalize only when the target date arrives.

    Allocation rule:
    - Net lifetime savings = income - expenses.
    - Finalized goals reserve their frozen finalized amount.
    - Remaining active goals share the remaining savings using deterministic priority weights.
    - Reaching 100% before the target date does NOT finalize the goal.
    - On/after the target date, the current priority-weighted allocation is frozen.
      Target reached -> Completed; otherwise -> Not Achieved.
    """
    from .models import SavingsGoal

    today = date.today()
    all_goals = list(SavingsGoal.objects.filter(user=user).order_by("target_date", "id"))
    allocations = defaultdict(lambda: ZERO)

    # First calculate dynamic progress for all currently active goals.
    active_goals, available = _current_active_allocations(user)
    active_allocations, _ = _priority_weighted_allocations(active_goals, available)
    allocations.update(active_allocations)

    # Freeze only goals whose target date has arrived.
    due_goals = [
        goal for goal in active_goals
        if goal.target_date <= today
    ]

    if due_goals:
        for goal in due_goals:
            achieved = min(
                money(active_allocations.get(goal.id, ZERO)),
                money(goal.target_amount),
            ).quantize(CENT)
            goal.is_finalized = True
            goal.is_active = False
            goal.finalized_amount = achieved
            goal.finalized_at = timezone.now()

            if achieved >= money(goal.target_amount):
                goal.status = "Completed"
                title = "Savings Goal Completed"
                message = _completion_message(goal)
            else:
                goal.status = "Not Achieved"
                title = "Savings Goal Deadline Reached"
                message = _missed_message(goal)

            goal.save(update_fields=[
                "is_finalized",
                "is_active",
                "finalized_amount",
                "finalized_at",
                "status",
                "updated_at",
            ])
            allocations[goal.id] = achieved
            if notify:
                _notify_once(user, title, message)

        # Due goals are now frozen. Recalculate all remaining active goals from
        # the savings left after frozen amounts are reserved.
        remaining_active, remaining_available = _current_active_allocations(user)
        recalculated, unallocated = _priority_weighted_allocations(
            remaining_active,
            remaining_available,
        )
        allocations.update(recalculated)
    else:
        _, unallocated = _priority_weighted_allocations(active_goals, available)

    # Always expose frozen values exactly as stored.
    for goal in all_goals:
        if goal.is_finalized:
            allocations[goal.id] = min(
                money(goal.finalized_amount),
                money(goal.target_amount),
            )

    return dict(allocations), unallocated


def check_goal_deadlines(user, notify=True):
    from .models import SavingsGoal

    today = date.today()
    allocations, _ = refresh_goal_allocations(user, notify=notify)

    for goal in SavingsGoal.objects.filter(
        user=user,
        is_active=True,
        is_finalized=False,
    ):
        days_remaining = (goal.target_date - today).days
        if 0 <= days_remaining <= 7 and notify:
            _notify_once(
                user,
                "Savings Goal Deadline",
                _deadline_message(goal),
            )

    return allocations
