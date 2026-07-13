from django.urls import path
from .views import (
    ExpenseListCreateView,
    ExpenseDetailView,
    TotalExpenseView,
)

urlpatterns = [

    path(
        "",
        ExpenseListCreateView.as_view(),
        name="expense-list-create"
    ),

    path(
        "total/",
        TotalExpenseView.as_view(),
        name="total-expense"
    ),

    path(
        "<int:pk>/",
        ExpenseDetailView.as_view(),
        name="expense-detail"
    ),

]