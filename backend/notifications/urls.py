from django.urls import path

from .views import (
    NotificationListCreateView,
    NotificationDetailView,
    MarkAsReadAPIView,
)

urlpatterns = [

    path(
        "",
        NotificationListCreateView.as_view(),
    ),

    path(
        "<int:pk>/",
        NotificationDetailView.as_view(),
    ),

    path(
        "<int:pk>/read/",
        MarkAsReadAPIView.as_view(),
    ),
]