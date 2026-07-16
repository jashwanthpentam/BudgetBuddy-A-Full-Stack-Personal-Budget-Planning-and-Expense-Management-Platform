from rest_framework import generics, permissions
from django.db.models import Sum
from rest_framework.views import APIView
from rest_framework.response import Response
from expenses.models import Expense
from .models import Income
from .serializers import IncomeSerializer


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

        return Response({

            "total_income": total_income,

            "total_expense": total_expense,

            "current_balance": total_income - total_expense

        })