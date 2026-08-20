from datetime import datetime
from django.db.models import Sum
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from budgets.models import Budget
from expenses.models import Expense
from income.models import Income
from notifications.models import Notification
from savings.models import SavingsGoal
from savings.serializers import SavingsGoalSerializer

from .serializers import (
    ExpenseReportSerializer,
    MonthlyFinancialReportSerializer,
    SavingsReportSerializer,
)

from .utils import (get_date_range, build_report)

class MonthlyFinancialReportView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        month = request.query_params.get("month")
        year = request.query_params.get("year")

        if not month or not year:
            return Response(
                {"error": "month and year are required."}, status=400
            )

        try:
            month = int(month)
            year = int(year)
        except (TypeError, ValueError):
            return Response({"error": "month and year must be valid integers."}, status=400)

        if month < 1 or month > 12 or year < 2000 or year > 2100:
            return Response({"error": "month must be 1-12 and year must be between 2000 and 2100."}, status=400)

        total_income = (
            Income.objects.filter(
                user=request.user,
                income_date__month=month,
                income_date__year=year,
            ).aggregate(total=Sum("amount"))["total"]
            or 0
        )

        total_expense = (
            Expense.objects.filter(
                user=request.user,
                expense_date__month=month,
                expense_date__year=year,
            ).aggregate(total=Sum("amount"))["total"]
            or 0
        )

        total_budget = (
            Budget.objects.filter(
                user=request.user,
                month=month,
                year=year,
            ).aggregate(total=Sum("budget_amount"))["total"]
            or 0
        )

        total_savings = max(total_income - total_expense, 0)

        current_balance = total_income - total_expense

        remaining_budget = max(total_budget - total_expense, 0)

        report = {
            "month": month,
            "year": year,
            "total_income": total_income,
            "total_expense": total_expense,
            "current_balance": current_balance,
            "total_savings": total_savings,
            "remaining_budget": remaining_budget,
        }

        print("Total Budget :", total_budget)
        print("Total Expense:", total_expense)
        print("Remaining    :", remaining_budget)

        serializer = MonthlyFinancialReportSerializer(report)

        return Response(serializer.data)


class ExpenseReportView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        start_date, end_date = get_date_range(request)

        if start_date and end_date:

            if isinstance(start_date, str):
                start_date = datetime.strptime(start_date, "%Y-%m-%d").date()

            if isinstance(end_date, str):
                end_date = datetime.strptime(end_date, "%Y-%m-%d").date()

        if not start_date or not end_date:
            return Response(
                {
                    "error": "start_date and end_date are required. "
                    "Provide either a valid filter or both start_date and end_date."
                },
                status=400,
            )

        if end_date < start_date:
            return Response(
                {
                    "error": "End date must be greater than or equal to start date."
                },
                status=400,
            )

        expenses = Expense.objects.filter(
            user=request.user, expense_date__range=[start_date, end_date]
        ).order_by("expense_date")

        serializer = ExpenseReportSerializer(expenses, many=True)

        total_amount = (
            expenses.aggregate(total=Sum("amount"))["total"] or 0
        )

        return Response(
            {
                "start_date": start_date,
                "end_date": end_date,
                "total_expenses": expenses.count(),
                "total_amount": total_amount,
                "expenses": serializer.data,
            }
        )


class SavingsReportView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        goals = SavingsGoal.objects.filter(user=request.user)

        serializer = SavingsGoalSerializer(goals, many=True)

        report = []

        for goal_data in serializer.data:
            report.append(
                {
                    "goal_name": goal_data["goal_name"],
                    "target_amount": goal_data["target_amount"],
                    "saved_amount": goal_data["saved_amount"],
                    "remaining_amount": goal_data["remaining_amount"],
                    "progress_percentage": goal_data["progress_percentage"],
                    "status": goal_data["status"],
                }
            )

        serializer = SavingsReportSerializer(report, many=True)

        return Response(serializer.data)


class FinancialSummaryView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        total_income = (
            Income.objects.filter(user=request.user).aggregate(
                total=Sum("amount")
            )["total"]
            or 0
        )

        total_expense = (
            Expense.objects.filter(user=request.user).aggregate(
                total=Sum("amount")
            )["total"]
            or 0
        )

        total_budget = (
            Budget.objects.filter(user=request.user).aggregate(
                total=Sum("budget_amount")
            )["total"]
            or 0
        )

        current_balance = total_income - total_expense

        remaining_budget = max(total_budget - total_expense, 0)

        total_savings = max(current_balance, 0)

        goals = SavingsGoal.objects.filter(user=request.user)

        serializer = SavingsGoalSerializer()

        active_goals = 0
        completed_goals = 0

        for goal in goals:

            progress = serializer.get_progress_percentage(goal)

            if progress >= 100:
                completed_goals += 1
            else:
                active_goals += 1

        notifications = Notification.objects.filter(user=request.user).order_by(
            "-created_at"
        )[:5]

        latest_notifications = []

        for notification in notifications:
            latest_notifications.append(
                {
                    "title": notification.title,
                    "message": notification.message,
                    "created_at": notification.created_at,
                }
            )

        return Response(
            {
                "income": {
                    "total_income": total_income,
                },
                "expense": {
                    "total_expense": total_expense,
                },
                "budget": {
                    "total_budget": total_budget,
                    "remaining_budget": remaining_budget,
                },
                "balance": {
                    "current_balance": current_balance,
                },
                "savings": {
                    "total_savings": total_savings,
                    "active_goals": active_goals,
                    "completed_goals": completed_goals,
                },
                "latest_notifications": latest_notifications,
            }
        )


class GenerateReportView(APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):

        start_date, end_date = get_date_range(request)

        if start_date and end_date:

            if isinstance(start_date, str):
                start_date = datetime.strptime(start_date, "%Y-%m-%d").date()

            if isinstance(end_date, str):
                end_date = datetime.strptime(end_date, "%Y-%m-%d").date()

        if not start_date or not end_date:
            return Response(
                {
                    "error": "Provide either a valid filter or both start_date and end_date."
                },
                status=400,
            )

        if end_date < start_date:
            return Response(
                {
                    "error": "End date must be greater than or equal to start date."
                },
                status=400,
            )

        
        report = build_report(
            request,
            start_date,
            end_date,
        )

        return Response(report) 