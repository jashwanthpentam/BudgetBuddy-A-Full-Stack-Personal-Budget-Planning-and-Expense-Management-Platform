from django.urls import path

from .views import (
    RegisterView,
    ProfileView,
    ChangePasswordView,
)


urlpatterns = [

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