from rest_framework import serializers


class MonthlyFinancialReportSerializer(serializers.Serializer):

    month = serializers.IntegerField()

    year = serializers.IntegerField()

    total_income = serializers.DecimalField(
        max_digits=12,
        decimal_places=2
    )

    total_expense = serializers.DecimalField(
        max_digits=12,
        decimal_places=2
    )

    current_balance = serializers.DecimalField(
        max_digits=12,
        decimal_places=2
    )

    total_savings = serializers.DecimalField(
        max_digits=12,
        decimal_places=2
    )

    remaining_budget = serializers.DecimalField(
        max_digits=12,
        decimal_places=2
    )

class ExpenseReportSerializer(serializers.Serializer):

    category = serializers.CharField()

    amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2
    )

    expense_date = serializers.DateField()

    description = serializers.CharField()

class SavingsReportSerializer(serializers.Serializer):

    goal_name = serializers.CharField()

    target_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2
    )

    saved_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2
    )

    remaining_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2
    )

    progress_percentage = serializers.DecimalField(
        max_digits=5,
        decimal_places=2
    )

    status = serializers.CharField()