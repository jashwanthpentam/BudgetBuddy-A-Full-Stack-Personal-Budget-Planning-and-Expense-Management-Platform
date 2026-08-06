from django.db.models import Sum

from expenses.models import Expense
from notifications.utils import create_notification

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

        create_notification(
            user=user,
            title="Budget Warning",
            message=(
                f"You have used {round(utilization, 2)}% "
                f"of your monthly {budget.category} budget."
            ),
            notification_type="budget",
        )

        budget.warning_80_sent = True

    if (
        utilization >= 90
        and not budget.warning_90_sent
    ):

        create_notification(
            user=user,
            title="High Budget Warning",
            message=(
                f"You have used {round(utilization, 2)}% "
                f"of your monthly {budget.category} budget."
            ),
            notification_type="budget",
        )

        budget.warning_90_sent = True

    if (
        utilization >= 100
        and not budget.warning_100_sent
    ):

        create_notification(
            user=user,
            title="Budget Reached",
            message=(
                f"You have completely used your "
                f"{budget.category} budget."
            ),
            notification_type="budget",
        )

        budget.warning_100_sent = True

    if (
        total_expense > budget.budget_amount
        and not budget.warning_exceeded_sent
    ):

        exceeded = total_expense - budget.budget_amount

        create_notification(
            user=user,
            title="Budget Exceeded",
            message=(
                f"You have exceeded your "
                f"{budget.category} budget by ₹{exceeded}."
            ),
            notification_type="budget",
        )

        budget.warning_exceeded_sent = True

    budget.save(update_fields=[
        "warning_80_sent",
        "warning_90_sent",
        "warning_100_sent",
        "warning_exceeded_sent",
    ])