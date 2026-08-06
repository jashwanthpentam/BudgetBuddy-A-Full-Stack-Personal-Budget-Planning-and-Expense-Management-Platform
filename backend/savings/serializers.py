from datetime import date
from django.db.models import Sum
from rest_framework import serializers

from .models import SavingsGoal
from income.models import Income
from expenses.models import Expense


class SavingsGoalSerializer(serializers.ModelSerializer):

    remaining_amount = serializers.SerializerMethodField()
    progress_percentage = serializers.SerializerMethodField()
    saved_amount = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()

    class Meta:
        model = SavingsGoal
        fields = [
            "id",
            "goal_name",
            "target_amount",
            "target_date",
            "saved_amount",
            "remaining_amount",
            "progress_percentage",
            "status",
            "created_at",
            "updated_at",
        ]

        read_only_fields = [
            "user",
            "saved_amount",
            "remaining_amount",
            "progress_percentage",
            "status",
            "created_at",
            "updated_at",
        ]

    # -----------------------------
    # Helper Methods
    # -----------------------------

    def calculate_saved_amount(self, obj):

        if not hasattr(self, "_saved_amount_cache"):
            self._saved_amount_cache = {}

        if obj.user.id not in self._saved_amount_cache:

            total_income = (
                Income.objects.filter(user=obj.user)
                .aggregate(total=Sum("amount"))["total"] or 0
            )

            total_expense = (
                Expense.objects.filter(user=obj.user)
                .aggregate(total=Sum("amount"))["total"] or 0
            )

            self._saved_amount_cache[obj.user.id] = (
                total_income - total_expense
            )

        return self._saved_amount_cache[obj.user.id]

    # -----------------------------
    # Serializer Fields
    # -----------------------------

    def get_saved_amount(self, obj):
        return self.calculate_saved_amount(obj)

    def get_remaining_amount(self, obj):

        return max(
            obj.target_amount - self.calculate_saved_amount(obj),
            0,
        )

    def get_progress_percentage(self, obj):

        saved = self.calculate_saved_amount(obj)

        if obj.target_amount == 0:
            return 0

        return round(
            min((saved / obj.target_amount) * 100, 100),
            2,
        )

    def get_status(self, obj):

        if self.get_progress_percentage(obj) >= 100:
            return "Completed"

        return "In Progress"

    # -----------------------------
    # Validation
    # -----------------------------

    def validate(self, data):

        goal_name = data.get("goal_name", "").strip()

        if not goal_name:
            raise serializers.ValidationError({
                "goal_name": "Goal name cannot be empty."
            })

        data["goal_name"] = goal_name

        if data["target_amount"] <= 0:
            raise serializers.ValidationError({
                "target_amount":
                "Target amount must be greater than 0."
            })

        if (
            self.instance is None and
            data["target_date"] < date.today()
        ):
            raise serializers.ValidationError({
                "target_date":
                "Target date cannot be in the past."
            })

        return data