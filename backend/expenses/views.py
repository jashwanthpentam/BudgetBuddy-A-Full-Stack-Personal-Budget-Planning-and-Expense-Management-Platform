from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum
from rest_framework import generics, permissions
from .models import Expense
from .serializers import ExpenseSerializer
from rest_framework.exceptions import ValidationError
from datetime import datetime

from budgets.models import Budget

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
        amount = serializer.validated_data["amount"]
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

    # Calculate total spent in this category this month

        total_spent = Expense.objects.filter(
            user=self.request.user,
            category=category,
            expense_date__month=month,
            expense_date__year=year
        ).aggregate(
            total=Sum("amount")
        )["total"] or 0

        remaining_budget = budget.budget_amount - total_spent

        if amount > remaining_budget:

            raise ValidationError({

                "error":
                (
                    f"Budget exceeded!\n\n"
                    f"Budget : ₹{budget.budget_amount}\n"
                    f"Spent : ₹{total_spent}\n"
                    f"Remaining : ₹{remaining_budget}"
                )

            })

        serializer.save(user=self.request.user)


class ExpenseDetailView(generics.RetrieveUpdateDestroyAPIView):

    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Expense.objects.filter(
            user=self.request.user
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