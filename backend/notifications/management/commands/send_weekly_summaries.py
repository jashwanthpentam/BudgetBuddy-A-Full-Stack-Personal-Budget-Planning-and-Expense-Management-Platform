from datetime import timedelta

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.db.models import Sum
from django.utils import timezone

from expenses.models import Expense
from income.models import Income
from notifications.models import NotificationPreference
from notifications.utils import create_notification


class Command(BaseCommand):
    help = "Send BudgetBuddy weekly financial summary emails."

    def handle(self, *args, **options):
        end = timezone.now().date()
        start = end - timedelta(days=6)

        users = User.objects.filter(
            is_active=True,
            email__isnull=False,
        ).exclude(email="")

        sent_count = 0
        skipped_count = 0

        for user in users.iterator():
            preferences, _ = NotificationPreference.objects.get_or_create(
                user=user
            )

            if not preferences.weekly_summary:
                skipped_count += 1
                continue

            income_total = (
                Income.objects
                .filter(
                    user=user,
                    income_date__range=(start, end),
                )
                .aggregate(total=Sum("amount"))["total"]
                or 0
            )

            expense_total = (
                Expense.objects
                .filter(
                    user=user,
                    expense_date__range=(start, end),
                )
                .aggregate(total=Sum("amount"))["total"]
                or 0
            )

            net = income_total - expense_total

            # Keep the scheduled command idempotent if Render retries
            # the cron job or the command is run twice on the same day.
            from notifications.models import Notification

            already_sent = Notification.objects.filter(
                user=user,
                notification_type="weekly_summary",
                title="Weekly Financial Summary",
                created_at__date=end,
            ).exists()

            if already_sent:
                skipped_count += 1
                continue

            message = (
                f"Here is your BudgetBuddy summary for "
                f"{start.strftime('%d %b %Y')} to {end.strftime('%d %b %Y')}.\n\n"
                f"Income: ₹{income_total}\n"
                f"Expenses: ₹{expense_total}\n"
                f"Net: ₹{net}"
            )

            notification = create_notification(
                user=user,
                title="Weekly Financial Summary",
                message=message,
                notification_type="weekly_summary",
                send_email=True,
                async_email=True,
            )

            if notification is not None:
                sent_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Weekly summary run completed. "
                f"Processed: {sent_count}, skipped: {skipped_count}."
            )
        )
