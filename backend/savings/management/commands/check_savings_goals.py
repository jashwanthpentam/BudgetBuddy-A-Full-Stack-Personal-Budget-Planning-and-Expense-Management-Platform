from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from savings.services import check_goal_deadlines


class Command(BaseCommand):
    help = "Refresh savings allocations, finalize completed goals, and send deadline alerts."

    def handle(self, *args, **options):
        processed = 0
        for user in User.objects.filter(is_active=True).iterator():
            check_goal_deadlines(user, notify=True)
            processed += 1
        self.stdout.write(self.style.SUCCESS(f"Savings goal automation completed for {processed} users."))
