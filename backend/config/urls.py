from django.contrib import admin
from django.urls import path, include

from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)


urlpatterns = [

    path(
        'admin/',
        admin.site.urls
    ),


    # JWT LOGIN API
    path(
        'api/token/',
        TokenObtainPairView.as_view(),
        name='token_obtain_pair'
    ),


    # JWT REFRESH API
    path(
        'api/token/refresh/',
        TokenRefreshView.as_view(),
        name='token_refresh'
    ),


    # USER REGISTER API
    path(
        'api/users/',
        include('users.urls')
    ),

]