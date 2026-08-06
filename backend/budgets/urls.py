from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BudgetViewSet, budget_summary, overall_budget_summary, budget_alert

router = DefaultRouter()
router.register(r'budgets', BudgetViewSet, basename='budget')

urlpatterns = [
    path('', include(router.urls)),

    path("budgets/<int:budget_id>/summary/", budget_summary, name="budget-summary"),

    path(
        "overall-summary/",
        overall_budget_summary,
        name="overall-budget-summary"
    ),

    path(
        "budgets/<int:budget_id>/alerts/",
        budget_alert,
        name="budget-alert",
    )
]