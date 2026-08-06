from django.db import models
from django.contrib.auth.models import User


class Budget(models.Model):
    CATEGORY_CHOICES = [
        ("FOOD", "Food"),
        ("TRAVEL", "Travel"),
        ("SHOPPING", "Shopping"),
        ("EDUCATION", "Education"),
        ("ENTERTAINMENT", "Entertainment"),
        ("HEALTHCARE", "Healthcare"),
        ("BILLS", "Bills"),
        ("MISCELLANEOUS", "Miscellaneous"),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="budgets"
    )

    category = models.CharField(
        max_length=50,
        choices=CATEGORY_CHOICES
    )

    budget_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    month = models.PositiveIntegerField()

    year = models.PositiveIntegerField()

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.username} - {self.category} ({self.month}/{self.year})"

    warning_80_sent = models.BooleanField(default=False)

    warning_90_sent = models.BooleanField(default=False)

    warning_100_sent = models.BooleanField(default=False)

    warning_exceeded_sent = models.BooleanField(default=False)