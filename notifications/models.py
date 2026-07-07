from django.db import models
from django.contrib.auth.models import User

class Notifications(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    message = models.TextField()

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return self.message[:30]