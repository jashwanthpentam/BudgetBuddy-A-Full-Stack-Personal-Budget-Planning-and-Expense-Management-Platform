from html import escape
from threading import Thread

import resend

from django.conf import settings

from .models import (
    Notification,
    NotificationPreference,
)


def get_budgetbuddy_logo_path():
    """Locate the BudgetBuddy logo used by the frontend."""

    base_dir = settings.BASE_DIR

    candidates = [
        base_dir / "frontend" / "public" / "budgetbuddy-mark.png",
        base_dir.parent / "frontend" / "public" / "budgetbuddy-mark.png",
        base_dir / "static" / "budgetbuddy-mark.png",
        base_dir / "static" / "images" / "budgetbuddy-mark.png",
        base_dir / "staticfiles" / "budgetbuddy-mark.png",
    ]

    for candidate in candidates:
        if candidate.exists() and candidate.is_file():
            return candidate

    return None


def send_notification_email(user, title, message):
    """
    Send one BudgetBuddy notification email using Resend.

    Returns True if Resend accepts the email successfully.
    """

    recipient = (user.email or "").strip()

    if not recipient:
        print(
            f"Notification email skipped for {user.username}: "
            "user has no email address."
        )
        return False

    resend_api_key = getattr(settings, "RESEND_API_KEY", "")

    if not resend_api_key:
        print(
            "Notification email skipped: "
            "RESEND_API_KEY is not configured."
        )
        return False

    try:
        resend.api_key = resend_api_key

        safe_title = escape(title)
        safe_message = escape(message).replace("\n", "<br>")
        safe_username = escape(user.username)

        html_content = f"""
        <html>
        <body style="
            font-family: Arial, sans-serif;
            background: #f4f6f9;
            padding: 20px;
        ">
            <div style="
                max-width: 600px;
                margin: auto;
                background: white;
                border-radius: 12px;
                padding: 30px;
                border: 1px solid #dddddd;
            ">

                <div style="
                    font-size: 24px;
                    font-weight: 700;
                    color: #0f172a;
                    margin-bottom: 20px;
                ">
                    BudgetBuddy
                </div>

                <hr>

                <h2 style="
                    color: #0f172a;
                ">
                    {safe_title}
                </h2>

                <p>
                    Hello <strong>{safe_username}</strong>,
                </p>

                <p>
                    {safe_message}
                </p>

                <br>

                <div style="
                    background: #f8f9fa;
                    padding: 15px;
                    border-left: 5px solid #c8a96b;
                ">
                    <strong>
                        This is an automated notification
                        from BudgetBuddy.
                    </strong>
                </div>

                <br>

                <p>
                    Thank you for using
                    <strong>BudgetBuddy</strong>.
                </p>

                <hr>

                <small style="
                    color: #64748b;
                ">
                    BudgetBuddy • Personal Budget Planning
                    &amp; Expense Management Platform
                </small>

            </div>
        </body>
        </html>
        """

        params = {
            "from": getattr(
                settings,
                "RESEND_FROM_EMAIL",
                "BudgetBuddy <onboarding@resend.dev>",
            ),
            "to": [recipient],
            "subject": f"BudgetBuddy | {title}",
            "html": html_content,
            "text": message,
        }

        response = resend.Emails.send(params)

        print(
            f"BudgetBuddy notification email accepted by Resend "
            f"for {recipient}. Response: {response}"
        )

        return True

    except Exception as error:

        print(
            f"BudgetBuddy notification email failed for "
            f"{recipient}: {error}"
        )

        return False


def create_notification(
    user,
    title,
    message,
    notification_type,
    *,
    send_email=True,
    async_email=True,
):
    """
    Create an in-app notification and optionally send an email.

    Normal API requests send the email in a background thread so
    the HTTP request is not delayed.

    Scheduled commands can use async_email=False.
    """

    preferences, _ = NotificationPreference.objects.get_or_create(
        user=user
    )

    notification_type = (
        notification_type or ""
    ).lower().strip()

    allowed = True

    if notification_type == "budget":
        allowed = preferences.budget_alerts

    elif notification_type == "expense":
        allowed = preferences.expense_alerts

    elif notification_type in ["saving", "savings"]:
        allowed = preferences.savings_alerts

    elif notification_type in ["report", "weekly_summary"]:
        allowed = preferences.weekly_summary

    if not allowed:

        print(
            f"Notification blocked by user preference: "
            f"{notification_type}"
        )

        return None

    notification = Notification.objects.create(
        user=user,
        title=title,
        message=message,
        notification_type=notification_type,
    )

    if not send_email:
        return notification

    def deliver_email():

        try:

            ok = send_notification_email(
                user,
                title,
                message,
            )

            notification.email_attempted = True
            notification.email_sent = bool(ok)

            if ok:
                notification.email_error = ""
            else:
                notification.email_error = (
                    "Resend did not accept the email."
                )

            notification.save(
                update_fields=[
                    "email_attempted",
                    "email_sent",
                    "email_error",
                ]
            )

        except Exception as error:

            print(
                f"Notification email delivery failed: {error}"
            )

            notification.email_attempted = True
            notification.email_sent = False
            notification.email_error = str(error)

            notification.save(
                update_fields=[
                    "email_attempted",
                    "email_sent",
                    "email_error",
                ]
            )

    if async_email:

        Thread(
            target=deliver_email,
            daemon=True,
        ).start()

    else:

        deliver_email()

    return notification