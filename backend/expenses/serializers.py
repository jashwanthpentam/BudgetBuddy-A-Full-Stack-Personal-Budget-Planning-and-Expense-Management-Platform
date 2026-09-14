from datetime import date
from decimal import Decimal

from django.db.models import Sum
from rest_framework import serializers

from .models import Expense
from budgets.models import Budget
from income.models import Income


class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = [
            "id", "amount", "category", "description", "expense_date",
            "created_at", "updated_at", "user"
        ]
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

    def validate(self, attrs):
        request = self.context.get("request")
        if request is None or not request.user.is_authenticated:
            return attrs

        user = request.user
        category = attrs.get(
            "category",
            self.instance.category if self.instance else None
        )
        expense_date = attrs.get(
            "expense_date",
            self.instance.expense_date if self.instance else None
        )
        amount = attrs.get(
            "amount",
            self.instance.amount if self.instance else None
        )

        if category and expense_date:
            if not Budget.objects.filter(
                user=user,
                category=category,
                month=expense_date.month,
                year=expense_date.year,
            ).exists():
                raise serializers.ValidationError({
                    "error": (
                        f"No budget created for {category} in "
                        f"{expense_date.month}/{expense_date.year}."
                    )
                })

        if amount is not None:
            income_total = Income.objects.filter(user=user).aggregate(
                total=Sum("amount")
            )["total"] or Decimal("0")

            existing_expenses = Expense.objects.filter(user=user)
            if self.instance is not None:
                existing_expenses = existing_expenses.exclude(
                    pk=self.instance.pk
                )

            expense_total = existing_expenses.aggregate(
                total=Sum("amount")
            )["total"] or Decimal("0")

            available_balance = income_total - expense_total

            if amount > available_balance:
                raise serializers.ValidationError({
                    "amount": (
                        f"Expense exceeds available balance of "
                        f"₹{available_balance:.2f}."
                    )
                })

        return attrs
