from django.urls import path

from .views import (
    dashboard_summary,
    analytics,
)

urlpatterns = [

    path(
        "summary/",
        dashboard_summary,
        name="dashboard-summary"
    ),

    path(
        "analytics/",
        analytics,
        name="dashboard-analytics"
    ),
]