from django.urls import path

from .views import (
    SavingsListCreateView,
    SavingsDetailView,
    GoalProgressAPIView,
    savings_summary,
)

urlpatterns = [

    path(
        "",
        SavingsListCreateView.as_view(),
    ),

    path(
        "<int:pk>/",
        SavingsDetailView.as_view(),
    ),

    path(
        "progress/<int:pk>/",
        GoalProgressAPIView.as_view(),
    ),

    path(
        "summary/",
        savings_summary,
        name="savings-summary"
    ),
]

