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


def create_notification(
    user,
    title,
    message,
    notification_type
):

    print("===== create_notification() called =====")

    # --------------------------------------------------
    # GET USER NOTIFICATION PREFERENCES
    # --------------------------------------------------

    preferences, created = (
        NotificationPreference.objects.get_or_create(
            user=user
        )
    )

    # --------------------------------------------------
    # CHECK WHETHER THIS NOTIFICATION IS ALLOWED
    # --------------------------------------------------

    notification_type = (
        notification_type or ""
    ).lower().strip()

    allowed = True

    if notification_type == "budget":

        allowed = preferences.budget_alerts

    elif notification_type == "expense":

        allowed = preferences.expense_alerts

    elif notification_type in [
        "saving",
        "savings",
    ]:

        allowed = preferences.savings_alerts

    elif notification_type in [
        "report",
        "weekly_summary",
    ]:

        allowed = preferences.weekly_summary

    # --------------------------------------------------
    # BLOCK DISABLED NOTIFICATIONS
    # --------------------------------------------------

    if not allowed:

        print(
            f"Notification blocked by user preference: "
            f"{notification_type}"
        )

        return None

    # --------------------------------------------------
    # CREATE NOTIFICATION
    # --------------------------------------------------

    notification = Notification.objects.create(

        user=user,

        title=title,

        message=message,

        notification_type=notification_type,

    )

    # --------------------------------------------------
    # SEND EMAIL
    # --------------------------------------------------

    if user.email:

        try:

            subject = (
                f"BudgetBuddy | {title}"
            )

            text_content = message

            logo_path = get_budgetbuddy_logo_path()

            logo_html = (
                '<img src="cid:budgetbuddy-logo" '
                'alt="BudgetBuddy" '
                'style="width:54px;height:54px;display:block;'
                'border-radius:14px;" />'
                if logo_path
                else '<div style="font-size:22px;font-weight:700;'
                     'color:#0f172a;">BudgetBuddy</div>'
            )

            html_content = f"""
            <html>

            <body style="
                font-family: Arial, sans-serif;
                background:#f4f6f9;
                padding:20px;
            ">

                <div style="
                    max-width:600px;
                    margin:auto;
                    background:white;
                    border-radius:12px;
                    padding:30px;
                    border:1px solid #ddd;
                ">

                    <div style="margin-bottom:10px;">
                        {logo_html}
                    </div>

                    <div style="
                        font-size:18px;
                        font-weight:700;
                        color:#0f172a;
                        margin-bottom:18px;
                    ">
                        BudgetBuddy
                    </div>

                    <hr>

                    <h3>{title}</h3>

                    <p>
                        Hello <b>{user.username}</b>,
                    </p>

                    <p>
                        {message}
                    </p>

                    <br>

                    <div style="
                        background:#F8F9FA;
                        padding:15px;
                        border-left:5px solid #c8a96b;
                    ">

                        <b>
                            This is an automated
                            notification from BudgetBuddy.
                        </b>

                    </div>

                    <br>

                    <p>
                        Thank you for using
                        <b>BudgetBuddy</b>.
                    </p>

                    <hr>

                    <small>
                        BudgetBuddy • Personal Budget
                        Planning & Expense Management Platform
                    </small>

                </div>

            </body>

            </html>
            """

            email = EmailMultiAlternatives(

                subject=subject,

                body=text_content,

                from_email=settings.DEFAULT_FROM_EMAIL,

                to=[user.email],

            )

            email.attach_alternative(
                html_content,
                "text/html",
            )

            # Embed the final BudgetBuddy mark directly in the email.
            if logo_path:
                try:
                    logo_data = logo_path.read_bytes()
                    logo_image = MIMEImage(
                        logo_data,
                        _subtype="png",
                    )
                    logo_image.add_header(
                        "Content-ID",
                        "<budgetbuddy-logo>",
                    )
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

            result = email.send()

            print(
                f"Email sent successfully: {result}"
            )

        except Exception as e:

            print(
                f"Email sending failed: {e}"
            )

    return notification