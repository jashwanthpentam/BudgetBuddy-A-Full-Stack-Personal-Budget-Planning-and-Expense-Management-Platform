from decimal import Decimal
from rest_framework import serializers
from .models import Budget


class BudgetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Budget
        fields = '__all__'
        read_only_fields = ['user', 'created_at', 'updated_at', 'warning_80_sent', 'warning_90_sent', 'warning_100_sent', 'warning_exceeded_sent']

    def validate(self, data):
        user = self.context['request'].user
        amount = data.get('budget_amount')
        month = data.get('month')
        year = data.get('year')
        category = data.get('category')

        if amount is not None and amount <= Decimal('0'):
            raise serializers.ValidationError({'budget_amount': 'Budget amount must be greater than 0.'})

        try:
            month = int(month)
        except (TypeError, ValueError):
            raise serializers.ValidationError({'month': 'Month must be an integer between 1 and 12.'})

        try:
            year = int(year)
        except (TypeError, ValueError):
            raise serializers.ValidationError({'year': 'Year must be an integer between 2000 and 2100.'})

        if not 1 <= month <= 12:
            raise serializers.ValidationError({'month': 'Month must be between 1 and 12.'})
        if not 2000 <= year <= 2100:
            raise serializers.ValidationError({'year': 'Year must be between 2000 and 2100.'})
        if not category or not str(category).strip():
            raise serializers.ValidationError({'category': 'Category is required.'})
        data['month'] = month
        data['year'] = year
        data['category'] = str(category).strip()

        qs = Budget.objects.filter(user=user, category=category, month=month, year=year)
        if self.instance:
            qs = qs.exclude(id=self.instance.id)
        if qs.exists():
            raise serializers.ValidationError('Budget already exists for this category, month and year.')
        return data
