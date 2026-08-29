from html import escape
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from email.mime.image import MIMEImage

from .models import (
    Notification,
    NotificationPreference,
)


def get_budgetbuddy_logo_path():
    """Locate the same final BudgetBuddy mark used by the frontend."""
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
    """Send one BudgetBuddy notification email. Returns True on success."""
    recipient = (user.email or "").strip()

    if not recipient:
        print(
            f"Notification email skipped for {user.username}: "
            """user has no email address."""
        )
        return False

    if not settings.EMAIL_HOST_USER or not settings.EMAIL_HOST_PASSWORD:
        print(
            "Notification email skipped: EMAIL_HOST_USER and "
            "EMAIL_HOST_PASSWORD are not configured."
        )
        return False

    subject = f"BudgetBuddy | {title}"
    text_content = message

    logo_path = get_budgetbuddy_logo_path()
    safe_title = escape(title)
    safe_message = escape(message).replace("\n", "<br>")
    safe_username = escape(user.username)

    logo_html = (
        '<img src="cid:budgetbuddy-logo" alt="BudgetBuddy" '
        'style="width:54px;height:54px;display:block;border-radius:14px;" />'
        if logo_path
        else '<div style="font-size:22px;font-weight:700;color:#0f172a;">'
             'BudgetBuddy</div>'
    )

    html_content = f"""
    <html>
    <body style="font-family:Arial,sans-serif;background:#f4f6f9;padding:20px;">
        <div style="max-width:600px;margin:auto;background:white;border-radius:12px;
                    padding:30px;border:1px solid #ddd;">
            <div style="margin-bottom:10px;">{logo_html}</div>
            <div style="font-size:18px;font-weight:700;color:#0f172a;margin-bottom:18px;">
                BudgetBuddy
            </div>
            <hr>
            <h3>{safe_title}</h3>
            <p>Hello <b>{safe_username}</b>,</p>
            <p>{safe_message}</p>
            <br>
            <div style="background:#F8F9FA;padding:15px;border-left:5px solid #c8a96b;">
                <b>This is an automated notification from BudgetBuddy.</b>
            </div>
            <br>
            <p>Thank you for using <b>BudgetBuddy</b>.</p>
            <hr>
            <small>BudgetBuddy • Personal Budget Planning &amp; Expense Management Platform</small>
        </div>
    </body>
    </html>
    """

    try:
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL or settings.EMAIL_HOST_USER,
            to=[recipient],
        )

        email.attach_alternative(html_content, "text/html")

        if logo_path:
            try:
                logo_data = logo_path.read_bytes()
                logo_image = MIMEImage(logo_data, _subtype="png")
                logo_image.add_header("Content-ID", "<budgetbuddy-logo>")
                logo_image.add_header(
                    "Content-Disposition",
                    "inline",
                    filename="budgetbuddy-mark.png",
                )
                email.attach(logo_image)
            except Exception as logo_error:
                print(
                    f"BudgetBuddy logo attachment failed: {logo_error}"
                )

        sent = email.send(fail_silently=False)

        if sent == 1:
            print(
                f"BudgetBuddy notification email sent to {recipient}."
            )
            return True

        print(
            f"BudgetBuddy email backend did not report a successful send "
            f"for {recipient}."
        )
        return False

    except Exception as error:
        print(
            f"BudgetBuddy notification email failed for {recipient}: {error}"
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
    """Create an in-app notification without blocking normal API requests.

    ``async_email=True`` is used by web requests so a slow/unreachable SMTP
    server cannot hold a Gunicorn worker hostage. Scheduled management
    commands can pass ``async_email=False`` when they need to wait for the
    delivery attempt to finish before the process exits.
    """

    preferences, created = NotificationPreference.objects.get_or_create(
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
            f"Notification blocked by user preference: {notification_type}"
        )
        return None

    notification = Notification.objects.create(
        user=user,
        title=title,
        message=message,
        notification_type=notification_type,
    )

    # IMPORTANT: HTTP/API requests must never perform SMTP work.
    # Email delivery is handled separately by the management command
    # ``send_pending_notifications``.
    # ``send_email`` and ``async_email`` are retained for compatibility with
    # existing callers, but SMTP is intentionally not performed here.
    return notification
