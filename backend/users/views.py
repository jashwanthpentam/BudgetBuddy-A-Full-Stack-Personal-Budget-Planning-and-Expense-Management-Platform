from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.hashers import check_password, make_password
from django.utils import timezone
from datetime import timedelta
import secrets
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.signing import BadSignature, SignatureExpired, TimestampSigner
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Profile, PasswordResetOTP

from .serializers import (
    RegisterSerializer,
    ProfileSerializer,
    ChangePasswordSerializer,
    BudgetBuddyTokenObtainPairSerializer,
)


# =========================================================
# REGISTER
# =========================================================

class RegisterView(
    generics.CreateAPIView
):

    queryset = User.objects.all()

    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "message": "Account created successfully.",
                "username": user.username,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


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


# =========================================================
# JWT LOGIN
# =========================================================

from rest_framework_simplejwt.views import TokenObtainPairView


class BudgetBuddyTokenObtainPairView(TokenObtainPairView):
    serializer_class = BudgetBuddyTokenObtainPairSerializer


# =========================================================
# PASSWORD RESET
# =========================================================

class PasswordResetRequestView(generics.GenericAPIView):
    """Legacy password-reset endpoint kept for compatibility.

    New frontend flows use the OTP endpoint below. This endpoint still accepts
    username/email and generates a reset link, but derives the frontend origin
    from the request when available so production links never default to
    localhost.
    """

    permission_classes = []

    def post(self, request):
        identifier = str(request.data.get("identifier") or "").strip()

        if not identifier:
            return Response(
                {"error": "Enter your username or registered email address."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = (
            User.objects.filter(username__iexact=identifier).first()
            or User.objects.filter(email__iexact=identifier).first()
        )

        generic_message = (
            "If an account matches that information, password reset "
            "instructions have been sent to its registered email address."
        )

        if not user or not user.is_active or not user.email:
            return Response({"message": generic_message})

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        frontend_base = (
            request.headers.get("Origin")
            or getattr(settings, "FRONTEND_BASE_URL", "")
            or "http://localhost:5173"
        ).rstrip("/")
        reset_url = f"{frontend_base}/reset-password/{uid}/{token}"

        from notifications.utils import send_branded_email

        html_body = f"""
        <p>We received a request to reset your BudgetBuddy password.</p>
        <p>
            <a href="{reset_url}"
               style="display:inline-block;padding:12px 18px;
                      background:#d5b678;color:#0f172a;
                      text-decoration:none;border-radius:8px;
                      font-weight:700;">
                Reset Password
            </a>
        </p>
        <p>If you did not request this, you can safely ignore this email.</p>
        """
        text_body = (
            f"Hello {user.username},\n\n"
            f"Reset your BudgetBuddy password: {reset_url}\n\n"
            "If you did not request this, you can safely ignore this email."
        )

        sent = send_branded_email(
            user,
            "BudgetBuddy | Password Reset",
            "Reset your password",
            html_body,
            text_body,
        )

        if not sent:
            return Response(
                {"error": "Unable to send reset instructions right now. Please try again later."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response({"message": generic_message})


PASSWORD_RESET_OTP_MAX_AGE = 10 * 60


def _get_valid_password_reset_otp(user):
    """Return the newest usable OTP record, or None when none is valid."""
    otp_record = PasswordResetOTP.objects.filter(
        user=user,
        used_at__isnull=True,
    ).first()

    if not otp_record or otp_record.expires_at <= timezone.now():
        return None

    if otp_record.attempts >= 5:
        return None

    return otp_record


def _make_password_reset_verification_token(user, otp_record):
    signer = TimestampSigner(salt="budgetbuddy-password-reset-otp")
    return signer.sign(f"{user.pk}:{otp_record.pk}")


def _read_password_reset_verification_token(token):
    signer = TimestampSigner(salt="budgetbuddy-password-reset-otp")
    try:
        value = signer.unsign(token, max_age=PASSWORD_RESET_OTP_MAX_AGE)
        user_id, otp_id = value.split(":", 1)
        return int(user_id), int(otp_id)
    except (BadSignature, SignatureExpired, TypeError, ValueError):
        return None, None


class PasswordResetOTPRequestView(generics.GenericAPIView):
    """Identify a user by username and send a verification OTP to their registered email."""

    permission_classes = []

    def post(self, request):
        username = str(request.data.get("username") or "").strip()
        generic_message = (
            "If an account matches that username, a verification code has "
            "been sent to its registered email address."
        )

        if not username:
            return Response(
                {"error": "Enter your username."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(username__iexact=username).first()
        if not user or not user.is_active or not user.email:
            return Response({"message": generic_message})

        PasswordResetOTP.objects.filter(
            user=user,
            used_at__isnull=True,
        ).update(used_at=timezone.now())

        otp = f"{secrets.randbelow(1_000_000):06d}"
        otp_record = PasswordResetOTP.objects.create(
            user=user,
            code_hash=make_password(otp),
            expires_at=timezone.now() + timedelta(minutes=10),
        )

        from notifications.utils import send_branded_email

        html_body = f"""
        <p>We received a request to reset your BudgetBuddy password.</p>
        <p>Your verification code is:</p>
        <div style="margin:18px 0;padding:16px 20px;text-align:center;
                    background:#f8fafc;border:1px solid #e5e7eb;
                    border-radius:10px;font-size:30px;letter-spacing:8px;
                    font-weight:800;color:#0f172a;">
            {otp}
        </div>
        <p>This code expires in <strong>10 minutes</strong> and can only be used once.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
        """
        text_body = (
            f"Hello {user.username},\n\n"
            f"Your BudgetBuddy password reset verification code is {otp}.\n"
            "This code expires in 10 minutes and can only be used once.\n\n"
            "If you did not request this, you can safely ignore this email."
        )

        sent = send_branded_email(
            user,
            "BudgetBuddy | Password Reset Verification Code",
            "Verify your password reset",
            html_body,
            text_body,
        )

        if not sent:
            otp_record.used_at = timezone.now()
            otp_record.save(update_fields=["used_at"])
            return Response(
                {"error": "Unable to send the verification code right now. Please try again later."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response({"message": generic_message})


class PasswordResetOTPVerifyView(generics.GenericAPIView):
    """Verify the emailed OTP without changing the password yet."""

    permission_classes = []

    def post(self, request):
        username = str(request.data.get("username") or "").strip()
        otp = str(request.data.get("otp") or "").strip()

        if not username or not otp:
            return Response(
                {"error": "Username and verification code are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not otp.isdigit() or len(otp) != 6:
            return Response(
                {"error": "Enter the 6-digit verification code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = User.objects.filter(username__iexact=username).first()
        if not user or not user.is_active:
            return Response(
                {"error": "Invalid or expired verification code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        otp_record = _get_valid_password_reset_otp(user)
        if not otp_record:
            return Response(
                {"error": "Invalid or expired verification code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not check_password(otp, otp_record.code_hash):
            otp_record.attempts += 1
            otp_record.save(update_fields=["attempts"])
            return Response(
                {"error": "Invalid or expired verification code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response({
            "message": "Verification successful. You can now create a new password.",
            "username": user.username,
            "verification_token": _make_password_reset_verification_token(
                user, otp_record
            ),
        })


class PasswordResetOTPConfirmView(generics.GenericAPIView):
    """Set a new password after OTP verification.

    The verification_token is issued only after the OTP endpoint validates
    the code. The old combined username/otp/password payload is still
    accepted for backward compatibility.
    """

    permission_classes = []

    def post(self, request):
        verification_token = str(
            request.data.get("verification_token") or ""
        ).strip()
        username = str(request.data.get("username") or "").strip()
        otp = str(request.data.get("otp") or "").strip()
        password = request.data.get("password") or ""

        if not password:
            return Response(
                {"error": "New password is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if verification_token:
            user_id, otp_id = _read_password_reset_verification_token(
                verification_token
            )
            if not user_id or not otp_id:
                return Response(
                    {"error": "Invalid or expired verification session. Please verify a new code."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            user = User.objects.filter(
                pk=user_id,
                is_active=True,
            ).first()
            otp_record = PasswordResetOTP.objects.filter(
                pk=otp_id,
                user_id=user_id,
                used_at__isnull=True,
            ).first()

            if not user or not otp_record or otp_record.expires_at <= timezone.now():
                return Response(
                    {"error": "Invalid or expired verification session. Please verify a new code."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            # Preserve the previous API contract for any older frontend/client.
            if not username or not otp:
                return Response(
                    {"error": "Username, verification code, and new password are required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not otp.isdigit() or len(otp) != 6:
                return Response(
                    {"error": "Enter the 6-digit verification code."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            user = User.objects.filter(
                username__iexact=username,
                is_active=True,
            ).first()
            if not user:
                return Response(
                    {"error": "Invalid or expired verification code."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            otp_record = _get_valid_password_reset_otp(user)
            if not otp_record:
                return Response(
                    {"error": "Invalid or expired verification code."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if not check_password(otp, otp_record.code_hash):
                otp_record.attempts += 1
                otp_record.save(update_fields=["attempts"])
                return Response(
                    {"error": "Invalid or expired verification code."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        try:
            validate_password(password, user=user)
        except DjangoValidationError as exc:
            return Response(
                {"error": " ".join(exc.messages)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(password)
        user.save(update_fields=["password"])
        otp_record.used_at = timezone.now()
        otp_record.save(update_fields=["used_at"])

        return Response({
            "message": "Password reset successfully. You can now sign in."
        })


class PasswordResetConfirmView(generics.GenericAPIView):
    """Legacy token confirmation retained for older reset links."""

    permission_classes = []

    def post(self, request):
        uid = request.data.get("uid")
        token = request.data.get("token")
        password = request.data.get("password") or ""

        try:
            user_id = force_str(urlsafe_base64_decode(uid or ""))
            user = User.objects.get(pk=user_id)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist):
            return Response(
                {"error": "Invalid or expired password reset link."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not default_token_generator.check_token(user, token or ""):
            return Response(
                {"error": "Invalid or expired password reset link."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            validate_password(password, user=user)
        except DjangoValidationError as exc:
            return Response(
                {"error": " ".join(exc.messages)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(password)
        user.save(update_fields=["password"])

        return Response({
            "message": "Password reset successfully. You can now sign in."
        })

