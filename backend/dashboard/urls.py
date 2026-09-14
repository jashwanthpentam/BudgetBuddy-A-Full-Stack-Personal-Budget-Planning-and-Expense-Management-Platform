from django.urls import path

from .views import (
    dashboard_summary,
    analytics,
    DeletionImpactView,
    BulkDeleteView,
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

urlpatterns += [
    path("delete-impact/", DeletionImpactView.as_view(), name="delete-impact"),
    path("bulk-delete/", BulkDeleteView.as_view(), name="bulk-delete"),
]
