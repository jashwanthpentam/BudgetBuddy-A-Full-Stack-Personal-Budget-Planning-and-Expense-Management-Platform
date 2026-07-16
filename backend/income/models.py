from django.db import models
from django.contrib.auth.models import User


class Income(models.Model):

    SOURCE_CHOICES = [

        ("SALARY", "Salary"),
        ("POCKET_MONEY", "Pocket Money"),
        ("SCHOLARSHIP", "Scholarship"),
        ("FREELANCING", "Freelancing"),
        ("BUSINESS", "Business"),
        ("OTHER", "Other"),

    ]

    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    source = models.CharField(
        max_length=30,
        choices=SOURCE_CHOICES
    )

    description = models.TextField(
        blank=True
    )

    income_date = models.DateField()

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE
    )

    def __str__(self):
        return self.title