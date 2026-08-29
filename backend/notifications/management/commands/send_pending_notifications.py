from django.core.management.base import BaseCommand
from django.utils import timezone

from notifications.models import Notification
from notifications.utils import send_notification_email


class Command(BaseCommand):
    help = "Send queued BudgetBuddy notification emails."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=50)

    def handle(self, *args, **options):
        limit = max(1, options["limit"])

        notifications = (
            Notification.objects
            .select_related("user")
            .filter(email_sent=False, email_attempted=False)
            .order_by("created_at")[:limit]
        )

        attempted = 0
        sent = 0
        failed = 0

        for notification in notifications:
            attempted += 1
            notification.email_attempted = True
            notification.email_error = ""
            notification.save(update_fields=["email_attempted", "email_error"])

            try:
                ok = send_notification_email(
                    notification.user,
                    notification.title,
                    notification.message,
                )
            except Exception as exc:
                ok = False
                notification.email_error = str(exc)

            notification.email_sent = bool(ok)
            if not ok and not notification.email_error:
                notification.email_error = "Email delivery failed."

            notification.save(
                update_fields=["email_sent", "email_error", "email_attempted"]
            )

            if ok:
                sent += 1
            else:
                failed += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Notification email run completed at {timezone.now().isoformat()}. "
                f"Attempted: {attempted}, sent: {sent}, failed: {failed}."
            )
        )
