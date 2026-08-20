from django.db import models
from django.contrib.auth.models import User


class Profile(models.Model):
    ROLE_CHOICES = [("student", "Student"), ("premium", "Premium User"), ("admin", "Admin")]
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="student")
    phone = models.CharField(max_length=15, blank=True)
    monthly_income = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    preferred_currency = models.CharField(max_length=10, default="INR")
    budget_alert_threshold = models.PositiveSmallIntegerField(default=80)
    date_of_birth = models.DateField(null=True, blank=True)
    profile_picture = models.ImageField(
        upload_to='profile_pictures/',
        null=True,
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.user.username
