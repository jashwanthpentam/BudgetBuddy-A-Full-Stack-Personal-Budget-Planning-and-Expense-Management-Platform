from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from django.contrib.auth.models import User

from .models import Profile

from .serializers import (
    RegisterSerializer,
    ProfileSerializer,
    ChangePasswordSerializer,
)


# =========================================================
# REGISTER
# =========================================================

class RegisterView(
    generics.CreateAPIView
):

    queryset = User.objects.all()

    serializer_class = RegisterSerializer


# =========================================================
# PROFILE
# =========================================================

class ProfileView(
    generics.RetrieveUpdateAPIView
):

    permission_classes = [
        IsAuthenticated
    ]

    serializer_class = ProfileSerializer

    def get_object(self):

        profile, created = Profile.objects.get_or_create(
            user=self.request.user
        )

        return profile


# =========================================================
# CHANGE PASSWORD
# =========================================================

class ChangePasswordView(
    generics.GenericAPIView
):

    permission_classes = [
        IsAuthenticated
    ]

    serializer_class = ChangePasswordSerializer

    def post(self, request):

        serializer = self.get_serializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        serializer.save()

        return Response(
            {
                "message":
                "Password changed successfully."
            },
            status=status.HTTP_200_OK
        )

class GoogleLoginView(generics.GenericAPIView):
    """Verify a Google OpenID Connect ID token and return BudgetBuddy JWT tokens."""
    permission_classes = []

    def post(self, request):
        from django.conf import settings
        from rest_framework_simplejwt.tokens import RefreshToken
        from rest_framework import status

        credential = request.data.get("credential")
        if not credential:
            return Response({"error": "Google credential is required."}, status=status.HTTP_400_BAD_REQUEST)

        client_id = getattr(settings, "GOOGLE_OAUTH_CLIENT_ID", "")
        if not client_id:
            return Response({"error": "Google OAuth is not configured on this server."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        try:
            from google.oauth2 import id_token
            from google.auth.transport import requests as google_requests
            info = id_token.verify_oauth2_token(credential, google_requests.Request(), client_id)
        except Exception:
            return Response({"error": "Invalid or expired Google credential."}, status=status.HTTP_401_UNAUTHORIZED)

        email = info.get("email")
        name = info.get("name") or email.split("@")[0]
        if not email or not info.get("email_verified", False):
            return Response({"error": "A verified Google email is required."}, status=status.HTTP_400_BAD_REQUEST)

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            base_username = "".join(ch for ch in name.lower().replace(" ", "_") if ch.isalnum() or ch == "_") or "user"
            username = base_username
            counter = 1
            while User.objects.filter(username=username).exists():
                counter += 1
                username = f"{base_username}_{counter}"
            user = User.objects.create_user(username=username, email=email)
            Profile.objects.get_or_create(user=user)

        refresh = RefreshToken.for_user(user)
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "username": user.username,
        })


class GitHubAuthorizeView(generics.GenericAPIView):
    permission_classes = []

    def get(self, request):
        from django.conf import settings
        from django.shortcuts import redirect
        from urllib.parse import urlencode

        client_id = getattr(settings, "GITHUB_CLIENT_ID", "")
        redirect_uri = getattr(settings, "GITHUB_REDIRECT_URI", "")
        if not client_id or not redirect_uri:
            return Response({"error": "GitHub OAuth is not configured on this server."}, status=503)

        params = urlencode({
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "scope": "read:user user:email",
        })
        return redirect(f"https://github.com/login/oauth/authorize?{params}")


class GitHubLoginView(generics.GenericAPIView):
    permission_classes = []

    def post(self, request):
        from django.conf import settings
        from rest_framework_simplejwt.tokens import RefreshToken
        import requests

        code = request.data.get("code")
        if not code:
            return Response({"error": "GitHub authorization code is required."}, status=400)

        client_id = getattr(settings, "GITHUB_CLIENT_ID", "")
        client_secret = getattr(settings, "GITHUB_CLIENT_SECRET", "")
        redirect_uri = getattr(settings, "GITHUB_REDIRECT_URI", "")
        if not client_id or not client_secret or not redirect_uri:
            return Response({"error": "GitHub OAuth is not configured on this server."}, status=503)

        token_response = requests.post(
            "https://github.com/login/oauth/access_token",
            data={"client_id": client_id, "client_secret": client_secret, "code": code, "redirect_uri": redirect_uri},
            headers={"Accept": "application/json"},
            timeout=10,
        )
        token_response.raise_for_status()
        access_token = token_response.json().get("access_token")
        if not access_token:
            return Response({"error": "GitHub authorization failed."}, status=401)

        headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json"}
        user_response = requests.get("https://api.github.com/user", headers=headers, timeout=10)
        user_response.raise_for_status()
        github_user = user_response.json()

        email = github_user.get("email")
        if not email:
            emails = requests.get("https://api.github.com/user/emails", headers=headers, timeout=10).json()
            verified = next((item["email"] for item in emails if item.get("verified")), None)
            email = verified
        if not email:
            return Response({"error": "A verified GitHub email is required."}, status=400)

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            base_username = github_user.get("login") or email.split("@")[0]
            username = base_username
            counter = 1
            while User.objects.filter(username=username).exists():
                counter += 1
                username = f"{base_username}_{counter}"
            user = User.objects.create_user(username=username, email=email)
            Profile.objects.get_or_create(user=user)

        refresh = RefreshToken.for_user(user)
        return Response({"access": str(refresh.access_token), "refresh": str(refresh), "username": user.username})
