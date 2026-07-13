from rest_framework import serializers
from .models import Expense


class ExpenseSerializer(serializers.ModelSerializer):

    class Meta:
        model = Expense
        fields = [
            "id",
            "title",
            "amount",
            "category",
            "description",
            "expense_date",
            "created_at",
            "updated_at",
            "user",
        ]
        read_only_fields = (
            "id",
            "created_at",
            "updated_at",
            "user",
        )