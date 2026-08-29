from django.db import models
from django.contrib.auth.models import User


class Notification(models.Model):

    NOTIFICATION_TYPES = [
        ("budget", "Budget"),
        ("expense", "Expense"),
        ("saving", "Saving"),
        ("reminder", "Reminder"),
        ("report", "Report"),
        ("weekly_summary", "Weekly Summary"),
    ]

    user = models.ForeignKey(
                                User, 
                                on_delete=models.CASCADE, 
                                related_name="notifications"
                            )   

    title = models.CharField(
        max_length=150
    )

    message = models.TextField()

    notification_type = models.CharField(
        max_length = 20,
        choices = NOTIFICATION_TYPES,
        default = "reminder",
    )

    is_read = models.BooleanField(
        default = False
    )

    created_at = models.DateTimeField(
        auto_now_add = True
    )

    class Meta:
        ordering = ["-created_at"]
        
    def __str__(self):
        return self.title

class NotificationPreference(models.Model):

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="notification_preferences"
    )

    budget_alerts = models.BooleanField(
        default=True
    )

    expense_alerts = models.BooleanField(
        default=True
    )

    savings_alerts = models.BooleanField(
        default=True
    )

    weekly_summary = models.BooleanField(
        default=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return f"{self.user.username} Notification Preferences"