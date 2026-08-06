from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Sum
from rest_framework import generics, permissions
from rest_framework.exceptions import ValidationError

from .models import Expense
from .serializers import ExpenseSerializer

from budgets.models import Budget
from budgets.utils import recalculate_budget_alert


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

    

        serializer.save(
            user=self.request.user
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

        expense = serializer.save()

        try:
            budget = Budget.objects.get(
                user=self.request.user,
                category=expense.category,
                month=expense.expense_date.month,
                year=expense.expense_date.year
            )

            recalculate_budget_alert(
                self.request.user,
                budget
            )

        except Budget.DoesNotExist:
            pass

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