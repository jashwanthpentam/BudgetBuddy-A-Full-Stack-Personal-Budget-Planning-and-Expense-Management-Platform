from datetime import date, timedelta

from rest_framework import generics, permissions
from rest_framework.generics import RetrieveAPIView
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from django.db.models import Sum

from .models import SavingsGoal
from .serializers import SavingsGoalSerializer

from income.models import Income
from expenses.models import Expense

from notifications.models import Notification
from notifications.utils import create_notification


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def calculate_saved_amount(user):

    total_income = (
        Income.objects
        .filter(user=user)
        .aggregate(total=Sum("amount"))["total"]
        or 0
    )

    total_expense = (
        Expense.objects
        .filter(user=user)
        .aggregate(total=Sum("amount"))["total"]
        or 0
    )

    return max(total_income - total_expense, 0)


def create_completion_notification(
    user,
    goal
):

    message = (
        f"Congratulations! You have completed "
        f"your savings goal '{goal.goal_name}'."
    )

    already_exists = Notification.objects.filter(
        user=user,
        notification_type="saving",
        title="Savings Goal Completed",
        message=message,
    ).exists()

    if already_exists:
        return

    create_notification(
        user=user,
        title="Savings Goal Completed",
        message=message,
        notification_type="saving",
    )


def create_deadline_notification(
    user,
    goal
):

    message = (
        f"Your savings goal '{goal.goal_name}' "
        f"is due on {goal.target_date.strftime('%d %B %Y')}."
    )

    already_exists = Notification.objects.filter(
        user=user,
        notification_type="saving",
        title="Savings Goal Deadline",
        message=message,
    ).exists()

    if already_exists:
        return

    create_notification(
        user=user,
        title="Savings Goal Deadline",
        message=message,
        notification_type="saving",
    )


def check_savings_notifications(user):

    today = date.today()

    saved_amount = calculate_saved_amount(user)

    goals = SavingsGoal.objects.filter(
        user=user
    )

    for goal in goals:

        # ----------------------------------------------------
        # COMPLETED GOAL
        # ----------------------------------------------------

        if (
            goal.target_amount > 0
            and saved_amount >= goal.target_amount
        ):

            create_completion_notification(
                user,
                goal
            )

            continue


        # ----------------------------------------------------
        # UPCOMING DEADLINE
        # ----------------------------------------------------

        days_remaining = (
            goal.target_date - today
        ).days


        if 0 <= days_remaining <= 7:

            create_deadline_notification(
                user,
                goal
            )


# ============================================================
# SAVINGS LIST + CREATE
# ============================================================

class SavingsListCreateView(
    generics.ListCreateAPIView
):

    serializer_class = SavingsGoalSerializer

    permission_classes = [
        permissions.IsAuthenticated
    ]


    def get_queryset(self):

        return SavingsGoal.objects.filter(
            user=self.request.user
        ).order_by("target_date")


    def perform_create(self, serializer):

        goal = serializer.save(
            user=self.request.user
        )

        create_notification(
            user=self.request.user,

            title="Savings Goal Created",

            message=(
                f"Your savings goal "
                f"'{goal.goal_name}' "
                "has been created successfully."
            ),

            notification_type="saving",
        )

        # Check whether the new goal already
        # qualifies for another notification.

        check_savings_notifications(
            self.request.user
        )


# ============================================================
# SAVINGS DETAIL
# ============================================================

class SavingsDetailView(
    generics.RetrieveUpdateDestroyAPIView
):

    serializer_class = SavingsGoalSerializer

    permission_classes = [
        permissions.IsAuthenticated
    ]


    def get_queryset(self):

        return SavingsGoal.objects.filter(
            user=self.request.user
        )


    def perform_update(self, serializer):

        goal = serializer.save()

        check_savings_notifications(
            self.request.user
        )


# ============================================================
# GOAL PROGRESS
# ============================================================

class GoalProgressAPIView(
    RetrieveAPIView
):

    serializer_class = SavingsGoalSerializer

    permission_classes = [
        permissions.IsAuthenticated
    ]


    def get_queryset(self):

        return SavingsGoal.objects.filter(
            user=self.request.user
        )


    def retrieve(
        self,
        request,
        *args,
        **kwargs
    ):

        goal = self.get_object()

        serializer = SavingsGoalSerializer(
            goal
        )

        return Response(
            serializer.data
        )


# ============================================================
# SAVINGS SUMMARY
# ============================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def savings_summary(request):

    # Check notifications whenever the
    # savings dashboard is opened.

    check_savings_notifications(
        request.user
    )


    goals = SavingsGoal.objects.filter(
        user=request.user
    ).order_by("target_date")


    total_target = (
        goals
        .aggregate(
            total=Sum("target_amount")
        )["total"]
        or 0
    )


    total_income = (
        Income.objects
        .filter(user=request.user)
        .aggregate(
            total=Sum("amount")
        )["total"]
        or 0
    )


    total_expense = (
        Expense.objects
        .filter(user=request.user)
        .aggregate(
            total=Sum("amount")
        )["total"]
        or 0
    )


    total_saved = (
        total_income -
        total_expense
    )


    # Status is derived from the same saved amount used by the serializer.
    # Do not rely on the database status field because it can become stale.
    completed_goals = 0
    active_goals = 0

    for goal in goals:
        if goal.target_amount > 0 and total_saved >= goal.target_amount:
            completed_goals += 1
        else:
            active_goals += 1


    remaining_amount = max(
        total_target - total_saved,
        0
    )


    overall_progress = (

        (
            total_saved /
            total_target
        ) * 100

        if total_target > 0

        else 0
    )


    return Response({

        "total_target":
            total_target,

        "total_saved":
            total_saved,

        "remaining_amount":
            remaining_amount,

        "active_goals":
            active_goals,

        "completed_goals":
            completed_goals,

        "overall_progress":
            round(
                overall_progress,
                2
            ),

    })