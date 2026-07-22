from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BudgetViewSet
from .views import BudgetViewSet, budget_summary
from .views import BudgetViewSet, budget_summary, overall_budget_summary

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
]