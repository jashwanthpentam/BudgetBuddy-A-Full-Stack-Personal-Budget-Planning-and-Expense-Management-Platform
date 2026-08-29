from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum
from rest_framework import generics, permissions
from rest_framework.exceptions import ValidationError

from .models import Expense
from .serializers import ExpenseSerializer

from budgets.models import Budget
from budgets.utils import recalculate_budget_alert
from notifications.utils import create_notification


class ExpenseListCreateView(generics.ListCreateAPIView):

    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):

        queryset = Expense.objects.filter(
            user=self.request.user
        )

        # Filter by category
        category = self.request.query_params.get("category")

        if category:
            queryset = queryset.filter(
                category=category
            )

        # Sort expenses
        sort = self.request.query_params.get("sort")

        if sort == "latest":
            queryset = queryset.order_by("-expense_date")

        elif sort == "oldest":
            queryset = queryset.order_by("expense_date")

        elif sort == "highest":
            queryset = queryset.order_by("-amount")

        elif sort == "lowest":
            queryset = queryset.order_by("amount")

        return queryset

    

    def perform_create(self, serializer):

        category = serializer.validated_data["category"]
        expense_date = serializer.validated_data["expense_date"]

        month = expense_date.month
        year = expense_date.year

    # Check whether budget exists

        try:

            budget = Budget.objects.get(
                user=self.request.user,
                category=category,
                month=month,
                year=year
            )

        except Budget.DoesNotExist:

            raise ValidationError({
                "error":
                f"No budget created for {category} in {month}/{year}."
            })

    

        expense = serializer.save(
            user=self.request.user
        )

        create_notification(
            user=self.request.user,
            title="Expense Recorded",
            message=(
                f"An expense of ₹{expense.amount} was recorded "
                f"under {expense.get_category_display()} on "
                f"{expense.expense_date.strftime('%d %B %Y')}."
            ),
            notification_type="expense",
        )

        recalculate_budget_alert(
            self.request.user,
            budget
        )

    

    


class ExpenseDetailView(generics.RetrieveUpdateDestroyAPIView):

    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Expense.objects.filter(
            user=self.request.user
        )

    def perform_update(self, serializer):

        old_instance = self.get_object()
        old_budget_key = (
            old_instance.category,
            old_instance.expense_date.month,
            old_instance.expense_date.year,
        )

        expense = serializer.save()

        budget_keys = {
            old_budget_key,
            (
                expense.category,
                expense.expense_date.month,
                expense.expense_date.year,
            ),
        }

        for category, month, year in budget_keys:
            try:
                budget = Budget.objects.get(
                    user=self.request.user,
                    category=category,
                    month=month,
                    year=year,
                )
                recalculate_budget_alert(
                    self.request.user,
                    budget
                )
            except Budget.DoesNotExist:
                continue

    def perform_destroy(self, instance):

        try:
            budget = Budget.objects.get(
                user=self.request.user,
                category=instance.category,
                month=instance.expense_date.month,
                year=instance.expense_date.year
            )

        except Budget.DoesNotExist:
            budget = None

        instance.delete()

        if budget:
            recalculate_budget_alert(
                self.request.user,
                budget
            )


class TotalExpenseView(APIView):

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):

        total = Expense.objects.filter(
            user=request.user
        ).aggregate(
            total=Sum("amount")
        )["total"]

        return Response({
            "total_expense": total if total else 0
        })