from datetime import date
from decimal import Decimal

from rest_framework import serializers

from .models import SavingsGoal
from .services import refresh_goal_allocations


class SavingsGoalSerializer(serializers.ModelSerializer):
    remaining_amount = serializers.SerializerMethodField()
    progress_percentage = serializers.SerializerMethodField()
    saved_amount = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    days_remaining = serializers.SerializerMethodField()

    class Meta:
        model = SavingsGoal
        fields = [
            "id", "goal_name", "target_amount", "target_date",
            "is_active", "is_finalized", "finalized_amount", "finalized_at",
            "saved_amount", "remaining_amount", "progress_percentage",
            "days_remaining", "status", "created_at", "updated_at",
        ]
        read_only_fields = [
            "user", "saved_amount", "remaining_amount", "progress_percentage",
            "days_remaining", "status", "finalized_amount", "finalized_at",
            "created_at", "updated_at",
        ]

    def _allocations(self, obj):
        allocations = self.context.get("allocations")
        if allocations is None:
            allocations, _ = refresh_goal_allocations(obj.user)
        return allocations

    def calculate_saved_amount(self, obj):
        if obj.is_finalized:
            return min(Decimal(obj.finalized_amount or 0), Decimal(obj.target_amount))
        return Decimal(self._allocations(obj).get(obj.id, 0))

    def get_saved_amount(self, obj):
        return self.calculate_saved_amount(obj)

    def get_remaining_amount(self, obj):
        return max(Decimal(obj.target_amount) - self.calculate_saved_amount(obj), Decimal("0"))

    def get_progress_percentage(self, obj):
        target = Decimal(obj.target_amount)
        if target <= 0:
            return 0
        return round(float(min(self.calculate_saved_amount(obj) / target * 100, Decimal("100"))), 2)

    def get_status(self, obj):
        if obj.is_finalized:
            return "Completed"
        return "In Progress" if obj.is_active else "Paused"

    def get_days_remaining(self, obj):
        return (obj.target_date - date.today()).days

    def validate(self, data):
        target_amount = data.get("target_amount", getattr(self.instance, "target_amount", None))
        target_date = data.get("target_date", getattr(self.instance, "target_date", None))

        if target_amount is not None and target_amount <= 0:
            raise serializers.ValidationError({"target_amount": "Target amount must be greater than 0."})
        if self.instance is None and target_date and target_date < date.today():
            raise serializers.ValidationError({"target_date": "Target date cannot be in the past."})
        if self.instance and self.instance.is_finalized and any(
            key in data for key in ("target_amount", "target_date", "is_active")
        ):
            raise serializers.ValidationError("Finalized goals are frozen and cannot be changed.")
        return data
