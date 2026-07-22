from rest_framework import generics, permissions
from django.db.models import Sum
from rest_framework.views import APIView
from rest_framework.response import Response
from expenses.models import Expense
from rest_framework.permissions import IsAuthenticated
from .models import Income
from .serializers import IncomeSerializer
from budgets.models import Budget
from django.db.models import Sum

class IncomeListCreateView(generics.ListCreateAPIView):

    serializer_class = IncomeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):

        queryset = Income.objects.filter(
            user=self.request.user
        )

        source = self.request.query_params.get("source")

        if source:
            queryset = queryset.filter(
                source=source
            )

        sort = self.request.query_params.get("sort")

        if sort == "latest":
            queryset = queryset.order_by("-income_date")

        elif sort == "oldest":
            queryset = queryset.order_by("income_date")

        elif sort == "highest":
            queryset = queryset.order_by("-amount")

        elif sort == "lowest":
            queryset = queryset.order_by("amount")

        return queryset

    def perform_create(self, serializer):

        serializer.save(
            user=self.request.user
        )


class IncomeDetailView(generics.RetrieveUpdateDestroyAPIView):

    serializer_class = IncomeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):

        return Income.objects.filter(
            user=self.request.user
        )

class TotalIncomeView(APIView):

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):

        total = Income.objects.filter(
                user=request.user
                ).aggregate(
                total=Sum("amount")
            )

        return Response({
            "total_income": total["total"] or 0
        })

class FinancialSummaryView(APIView):

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):

        total_income = Income.objects.filter(
            user=request.user
        ).aggregate(
            total=Sum("amount")
        )["total"] or 0

        total_expense = Expense.objects.filter(
            user=request.user
        ).aggregate(
            total=Sum("amount")
        )["total"] or 0

        total_budget = Budget.objects.filter(
            user=request.user
        ).aggregate(
            total=Sum("budget_amount")
        )["total"] or 0

        remaining_budget = total_budget - total_expense

        recent_income = Income.objects.filter(
            user=request.user
        ).order_by("-income_date")[:5]

        recent_expense = Expense.objects.filter(
            user=request.user
        ).order_by("-expense_date")[:5]

        recent_transactions = []

        for income in recent_income:
            recent_transactions.append({
                "type": "Income",
                "amount": income.amount,
                "category": income.source,
                "date": income.income_date
            })

        for expense in recent_expense:
            recent_transactions.append({
                "type": "Expense",
                "amount": expense.amount,
                "category": expense.category,
                "date": expense.expense_date
            })

        recent_transactions.sort(
            key=lambda x: x["date"],
            reverse=True
        )

        return Response({

            "total_income": total_income,

            "total_expense": total_expense,

            "current_balance": total_income - total_expense,

            "total_budget": total_budget,

            "remaining_budget": remaining_budget,

            "recent_transactions": recent_transactions[:5]

        })

class TransactionDashboardAPIView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        # Total Income
        total_income = Income.objects.filter(
            user=request.user
        ).aggregate(
            total=Sum("amount")
        )["total"] or 0

        # Total Expense
        total_expense = Expense.objects.filter(
            user=request.user
        ).aggregate(
            total=Sum("amount")
        )["total"] or 0

        # Current Balance
        current_balance = total_income - total_expense

        # Total Budget
        total_budget = Budget.objects.filter(
            user=request.user
        ).aggregate(
            total=Sum("budget_amount")
        )["total"] or 0

        # Remaining Budget
        remaining_budget = total_budget - total_expense

        if remaining_budget < 0:
            remaining_budget = 0

        # Recent Transactions
        recent_transactions = Expense.objects.filter(
            user=request.user
        ).order_by("-expense_date", "-id")[:5]

        transactions = []

        for expense in recent_transactions:

            transactions.append({

                "id": expense.id,
                "date": expense.expense_date,
                "amount": expense.amount,
                "category": expense.category,
                "description": expense.description

            })

        return Response({

            "total_income": total_income,
            "total_expense": total_expense,
            "current_balance": current_balance,
            "total_budget": total_budget,
            "remaining_budget": remaining_budget,
            "recent_transactions": transactions

        })