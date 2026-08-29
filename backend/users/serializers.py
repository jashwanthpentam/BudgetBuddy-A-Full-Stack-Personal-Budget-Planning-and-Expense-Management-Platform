from decimal import Decimal

from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password

from .models import Profile


# =========================================================
# REGISTER
# =========================================================

class RegisterSerializer(serializers.ModelSerializer):

    password = serializers.CharField(
        write_only=True
    )

    class Meta:
        model = User

        fields = [
            "username",
            "email",
            "password",
        ]

    def validate_username(self, value):

        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "Username is required."
            )

        if User.objects.filter(
            username__iexact=value
        ).exists():

            raise serializers.ValidationError(
                "This username is already taken."
            )

        return value

    def validate_email(self, value):

        value = value.strip().lower()

        if User.objects.filter(
            email__iexact=value
        ).exists():

            raise serializers.ValidationError(
                "This email is already registered."
            )

        return value

    def create(self, validated_data):

        user = User.objects.create_user(
            username=validated_data["username"].strip(),
            email=validated_data["email"].strip().lower(),
            password=validated_data["password"]
        )

        # Create profile automatically
        Profile.objects.get_or_create(
            user=user
        )

        return user


# =========================================================
# PROFILE
# =========================================================

class ProfileSerializer(serializers.ModelSerializer):

    username = serializers.CharField(
        source="user.username"
    )

    email = serializers.EmailField(
        source="user.email"
    )

    class Meta:
        model = Profile

        fields = [
            "role",
            "username",
            "email",
            "phone",
            "date_of_birth",
            "profile_picture",
            "monthly_income",
            "preferred_currency",
            "budget_alert_threshold",
        ]
        read_only_fields = ["role"]

    def get_role(self, obj):
        return obj.role

    def validate_username(self, value):

        user = self.context["request"].user

        # Check whether another user already
        # has this username
        if User.objects.filter(
            username=value
        ).exclude(
            pk=user.pk
        ).exists():

            raise serializers.ValidationError(
                "This username is already taken."
            )

        return value

    def validate_email(self, value):

        user = self.context["request"].user
        value = value.strip().lower()

        # Prevent duplicate email addresses, including case-only
        # differences such as User@Example.com vs user@example.com.
        if User.objects.filter(
            email__iexact=value
        ).exclude(
            pk=user.pk
        ).exists():

            raise serializers.ValidationError(
                "This email is already registered."
            )

        return value

    def validate_monthly_income(self, value):
        if value < Decimal("0"):
            raise serializers.ValidationError("Monthly income cannot be negative.")
        return value

    def validate_budget_alert_threshold(self, value):
        if value < 50 or value > 100:
            raise serializers.ValidationError("Budget alert threshold must be between 50 and 100.")
        return value

    def update(self, instance, validated_data):

        user_data = validated_data.pop(
            "user",
            {}
        )

        # Update username
        if "username" in user_data:

            instance.user.username = (
                user_data["username"]
            )

        # Update email
        if "email" in user_data:

            instance.user.email = (
                user_data["email"]
            )

        instance.user.save()

        # Update profile fields
        if "phone" in validated_data:

            instance.phone = (
                validated_data["phone"]
            )

        if "date_of_birth" in validated_data:

            instance.date_of_birth = (
                validated_data["date_of_birth"]
            )

        if "profile_picture" in validated_data:
            instance.profile_picture = validated_data["profile_picture"]

        if "monthly_income" in validated_data:
            instance.monthly_income = validated_data["monthly_income"]

        if "preferred_currency" in validated_data:
            instance.preferred_currency = validated_data["preferred_currency"]

        if "budget_alert_threshold" in validated_data:
            instance.budget_alert_threshold = validated_data["budget_alert_threshold"]

        instance.save()

        return instance

# =========================================================
# CHANGE PASSWORD
# =========================================================

class ChangePasswordSerializer(
    serializers.Serializer
):

    current_password = serializers.CharField(
        write_only=True
    )

    new_password = serializers.CharField(
        write_only=True
    )

    confirm_password = serializers.CharField(
        write_only=True
    )

    def validate(self, data):

        user = self.context[
            "request"
        ].user

        # Check current password
        if not user.check_password(
            data["current_password"]
        ):

            raise serializers.ValidationError({
                "current_password":
                "Current password is incorrect."
            })

        # Check new passwords
        if (
            data["new_password"]
            != data["confirm_password"]
        ):

            raise serializers.ValidationError({
                "confirm_password":
                "New passwords do not match."
            })

        # Validate password strength
        validate_password(
            data["new_password"],
            user
        )

        return data

    def save(self, **kwargs):

        user = self.context[
            "request"
        ].user

        user.set_password(
            self.validated_data[
                "new_password"
            ]
        )

        user.save()

        return user