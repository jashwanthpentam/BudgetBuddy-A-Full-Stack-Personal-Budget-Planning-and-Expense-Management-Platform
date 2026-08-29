from django.db.models import Sum

from expenses.models import Expense
from notifications.utils import create_notification


def _send_budget_notification(
    user,
    title,
    message,
):
    """Create a budget notification and return whether its email was sent."""
    notification = create_notification(
        user=user,
        title=title,
        message=message,
        notification_type="budget",
    )

    if notification is None:
        return False

    # The email is intentionally dispatched asynchronously. The notification
    # itself is the durable event, so budget alert state must not depend on
    # SMTP availability. Otherwise every later expense could trigger the same
    # alert again when SMTP is slow or temporarily unavailable.
    return True


def recalculate_budget_alert(user, budget):

    total_expense = Expense.objects.filter(
        user=user,
        category=budget.category,
        expense_date__month=budget.month,
        expense_date__year=budget.year
    ).aggregate(
        total=Sum("amount")
    )["total"] or 0

    utilization = (
        total_expense / budget.budget_amount
    ) * 100

    if (
        utilization >= 80
        and not budget.warning_80_sent
    ):

        if _send_budget_notification(
            user=user,
            title="Budget Warning",
            message=(
                f"You have used {round(utilization, 2)}% "
                f"of your monthly {budget.category} budget."
            ),
        ):
            budget.warning_80_sent = True

    if (
        utilization >= 90
        and not budget.warning_90_sent
    ):

        if _send_budget_notification(
            user=user,
            title="High Budget Warning",
            message=(
                f"You have used {round(utilization, 2)}% "
                f"of your monthly {budget.category} budget."
            ),
        ):
            budget.warning_90_sent = True

    if (
        utilization >= 100
        and not budget.warning_100_sent
    ):

        if _send_budget_notification(
            user=user,
            title="Budget Reached",
            message=(
                f"You have completely used your "
                f"{budget.category} budget."
            ),
        ):
            budget.warning_100_sent = True

    if (
        total_expense > budget.budget_amount
        and not budget.warning_exceeded_sent
    ):

        exceeded = total_expense - budget.budget_amount

        if _send_budget_notification(
            user=user,
            title="Budget Exceeded",
            message=(
                f"You have exceeded your "
                f"{budget.category} budget by ₹{exceeded}."
            ),
        ):
            budget.warning_exceeded_sent = True

    budget.save(update_fields=[
        "warning_80_sent",
        "warning_90_sent",
        "warning_100_sent",
        "warning_exceeded_sent",
    ])
