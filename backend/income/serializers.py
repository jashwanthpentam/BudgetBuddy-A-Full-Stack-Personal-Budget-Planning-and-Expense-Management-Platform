from datetime import date
from decimal import Decimal
from rest_framework import serializers
from .models import Income


class IncomeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Income
        fields = "__all__"
        read_only_fields = ["user", "created_at", "updated_at"]

    def validate_amount(self, value):
        if value <= Decimal("0"):
            raise serializers.ValidationError("Amount must be greater than 0.")
        return value

    def validate_source(self, value):
        value = value.strip() if isinstance(value, str) else value
        if not value:
            raise serializers.ValidationError("Income source is required.")
        return value

    def validate_income_date(self, value):
        if value > date.today():
            raise serializers.ValidationError("Income date cannot be in the future.")
        return value
