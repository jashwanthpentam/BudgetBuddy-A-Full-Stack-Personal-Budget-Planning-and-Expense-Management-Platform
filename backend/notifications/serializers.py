from rest_framework import serializers

from .models import (
    Notification,
    NotificationPreference,
)


class NotificationSerializer(
    serializers.ModelSerializer
):

    class Meta:

        model = Notification

        fields = "__all__"

        read_only_fields = [
            "user",
            "created_at",
        ]


class NotificationPreferenceSerializer(
    serializers.ModelSerializer
):

    class Meta:

        model = NotificationPreference

        fields = [
            "budget_alerts",
            "expense_alerts",
            "savings_alerts",
            "weekly_summary",
            "updated_at",
        ]

        read_only_fields = [
            "updated_at",
        ]