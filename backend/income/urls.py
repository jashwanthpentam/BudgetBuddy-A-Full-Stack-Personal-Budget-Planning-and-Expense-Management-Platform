from django.urls import path
from .views import TransactionDashboardAPIView
from .views import (
    IncomeListCreateView,
    IncomeDetailView,
    TotalIncomeView,
    FinancialSummaryView,
)

urlpatterns = [

    path(
        "",
        IncomeListCreateView.as_view(),
        name="income-list-create",
    ),

    path(
        "<int:pk>/",
        IncomeDetailView.as_view(),
        name="income-detail",
    ),

    path(
    "total/",
    TotalIncomeView.as_view(),
    name="total-income",
    ),

    path(
    "summary/",
    FinancialSummaryView.as_view(),
    name="financial-summary",
    ),

    path(
    "dashboard/",
    TransactionDashboardAPIView.as_view(),
    name="transaction-dashboard"
    ),
]