from rest_framework import serializers
from .models import Budget

class BudgetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Budget
        fields = '__all__'
        read_only_fields = ['user', 'created_at', 'updated_at']

    def validate(self, data):
        user = self.context['request'].user

        qs = Budget.objects.filter(
            user=user,
            category=data['category'],
            month=data['month'],
            year=data['year']
        )

        if self.instance:
            qs = qs.exclude(id=self.instance.id)

        if qs.exists():
            raise serializers.ValidationError(
                "Budget already exists for this category, month and year."
            )

        return data