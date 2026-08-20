from datetime import date
from rest_framework import serializers
from .models import SavingsGoal
from income.models import Income
from expenses.models import Expense
from django.db.models import Sum

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

    def get_remaining_amount(self, obj):

        return max(
            obj.target_amount -
            self.calculate_saved_amount(obj),
            0
        )

    def get_saved_amount(self, obj):

        return self.calculate_saved_amount(obj)

    def get_progress_percentage(self, obj):

        saved = self.calculate_saved_amount(obj)

        if obj.target_amount == 0:
            return 0

        return round(
            min(saved / obj.target_amount * 100, 100),
            2,
        )

    def calculate_saved_amount(self, obj):

        total_income = (
            Income.objects.filter(user=obj.user)
            .aggregate(total=Sum("amount"))["total"] or 0
        )

        total_expense = (
            Expense.objects.filter(user=obj.user)
            .aggregate(total=Sum("amount"))["total"] or 0
        )

        return max(total_income - total_expense, 0)

    def validate(self, data):

        if data["target_amount"] <= 0:
            raise serializers.ValidationError(
                {
                    "target_amount":
                    "Target amount must be greater than 0."
                }
            )


        if (
            self.instance is None and
            data["target_date"] < date.today()
        ):
            raise serializers.ValidationError(
                {
                    "target_date":
                    "Target date cannot be in the past."
                }
            )

        return data

    

    def get_status(self, obj):

        if self.get_progress_percentage(obj) >= 100:

            return "Completed"

        return "In Progress"