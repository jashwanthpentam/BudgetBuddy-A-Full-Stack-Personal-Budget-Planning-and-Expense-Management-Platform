from django.urls import path

from .views import (
    RegisterView,
    ProfileView,
    ChangePasswordView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    PasswordResetOTPRequestView,
    PasswordResetOTPConfirmView,
)


urlpatterns = [

    # Password recovery (public)
    path("password-reset/request/", PasswordResetRequestView.as_view(), name="password-reset-request"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("password-reset/request-otp/", PasswordResetOTPRequestView.as_view(), name="password-reset-request-otp"),
    path("password-reset/confirm-otp/", PasswordResetOTPConfirmView.as_view(), name="password-reset-confirm-otp"),

    # Registration
    path(
        "register/",
        RegisterView.as_view(),
        name="register"
    ),

    # Current user's profile
    path(
        "profile/",
        ProfileView.as_view(),
        name="profile"
    ),

    # Change password
    path(
        "change-password/",
        ChangePasswordView.as_view(),
        name="change-password"
    ),

]