from datetime import date
from decimal import Decimal
from rest_framework import serializers
from .models import Expense


class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = ["id", "amount", "category", "description", "expense_date", "created_at", "updated_at", "user"]
        read_only_fields = ("id", "created_at", "updated_at", "user")

    def validate_amount(self, value):
        if value <= Decimal("0"):
            raise serializers.ValidationError("Amount must be greater than 0.")
        return value

    def validate_category(self, value):
        value = value.strip() if isinstance(value, str) else value
        if not value:
            raise serializers.ValidationError("Category is required.")
        return value

    def validate_expense_date(self, value):
        if value > date.today():
            raise serializers.ValidationError("Expense date cannot be in the future.")
        return value
