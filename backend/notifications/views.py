from rest_framework import generics, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import (
    Notification,
    NotificationPreference,
)
from .serializers import (
    NotificationSerializer,
    NotificationPreferenceSerializer,
)


class NotificationListCreateView(generics.ListCreateAPIView):

    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(
            user=self.request.user
        ).order_by("-created_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class NotificationDetailView(
    generics.RetrieveUpdateDestroyAPIView
):

    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(
            user=self.request.user
        )


class MarkAsReadAPIView(APIView):

    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, pk):

        notification = get_object_or_404(
            Notification,
            pk=pk,
            user=request.user
        )

        notification.is_read = True
        notification.save(update_fields=["is_read"])

        return Response({
            "message": "Notification marked as read."
        })

class NotificationPreferenceView(
    generics.RetrieveUpdateAPIView
):

    serializer_class = (
        NotificationPreferenceSerializer
    )

    permission_classes = [
        permissions.IsAuthenticated
    ]

    def get_object(self):

        preference, created = (
            NotificationPreference.objects.get_or_create(
                user=self.request.user
            )
        )

        return preference