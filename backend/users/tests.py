from datetime import timedelta

from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from .models import PasswordResetOTP
from django.contrib.auth.hashers import make_password


class PasswordResetOTPFlowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="otp_user",
            email="otp@example.com",
            password="OldPass123!",
        )
        self.otp = "123456"
        self.record = PasswordResetOTP.objects.create(
            user=self.user,
            code_hash=make_password(self.otp),
            expires_at=timezone.now() + timedelta(minutes=10),
        )

    def test_verify_otp_does_not_change_password(self):
        response = self.client.post(
            "/api/users/password-reset/verify-otp/",
            {"username": self.user.username, "otp": self.otp},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("verification_token", response.data)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("OldPass123!"))
        self.record.refresh_from_db()
        self.assertIsNone(self.record.used_at)

    def test_verification_token_allows_password_reset(self):
        response = self.client.post(
            "/api/users/password-reset/verify-otp/",
            {"username": self.user.username, "otp": self.otp},
            format="json",
        )
        token = response.data["verification_token"]

        reset = self.client.post(
            "/api/users/password-reset/confirm-otp/",
            {
                "username": self.user.username,
                "verification_token": token,
                "password": "NewPass123!",
            },
            format="json",
        )
        self.assertEqual(reset.status_code, 200)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("NewPass123!"))
        self.record.refresh_from_db()
        self.assertIsNotNone(self.record.used_at)
