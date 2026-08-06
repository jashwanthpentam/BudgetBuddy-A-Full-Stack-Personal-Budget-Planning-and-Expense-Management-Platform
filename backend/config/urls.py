from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)


def home(request):
    return JsonResponse({
        "Project": "BudgetBuddy Backend",
        "Status": "Running Successfully",
        "Framework": "Django REST Framework",
        "APIs": {
            "Register": "/api/users/register/",
            "Login JWT": "/api/token/",
            "Refresh Token": "/api/token/refresh/"
        }
    })


urlpatterns = [

    path('', home),

    path('admin/', admin.site.urls),

    path(
        'api/token/',
        TokenObtainPairView.as_view(),
        name='token_obtain_pair'
    ),

    path(
        'api/token/refresh/',
        TokenRefreshView.as_view(),
        name='token_refresh'
    ),

    path(
        'api/users/',
        include('users.urls')
    ),

    path(
        'api/expenses/',
        include('expenses.urls')
    ),

    path(
    "api/income/",
    include("income.urls")
    ),

    path(
    "api/", 
    include("budgets.urls")),

    path(
    "api/dashboard/", 
    include("dashboard.urls")),

    path(
    "api/savings/",
    include("savings.urls"),
    ),

    path(
        "api/notifications/",
        include("notifications.urls"),
    ),

    path(
        "api/reports/",
        include("reports.urls"),
    ),

]