from html import escape
from threading import Thread
import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings
from django.db import close_old_connections

from .models import (
    Notification,
    NotificationPreference,
)


# ============================================================
# SEND EMAIL USING BREVO API
# ============================================================

def send_notification_email(user, title, message):
    """
    Send one BudgetBuddy notification email using the Brevo API.

    Returns:
        True  -> Email successfully accepted by Brevo
        False -> Email failed or was rejected
    """

    recipient = (user.email or "").strip()

    # --------------------------------------------------------
    # Check recipient email
    # --------------------------------------------------------

    if not recipient:
        print(
            f"Notification email skipped for {user.username}: "
            "user has no email address."
        )
        return False

    # --------------------------------------------------------
    # Get Brevo API key
    # --------------------------------------------------------

    brevo_api_key = (
        getattr(settings, "BREVO_API_KEY", "") or ""
    ).strip()

    if not brevo_api_key:
        print(
            "Notification email skipped: "
            "BREVO_API_KEY is not configured."
        )
        return False

    # --------------------------------------------------------
    # Get sender email
    # --------------------------------------------------------

    sender_email = (
        getattr(settings, "BREVO_FROM_EMAIL", "")
        or getattr(settings, "DEFAULT_FROM_EMAIL", "")
        or ""
    ).strip()

    if not sender_email:
        print(
            "Notification email skipped: "
            "BREVO_FROM_EMAIL or DEFAULT_FROM_EMAIL "
            "is not configured."
        )
        return False

    # --------------------------------------------------------
    # Escape user content for HTML security
    # --------------------------------------------------------

    safe_title = escape(str(title))
    safe_message = escape(str(message)).replace(
        "\n",
        "<br>"
    )
    safe_username = escape(
        user.username or "BudgetBuddy User"
    )

    subject = f"BudgetBuddy | {title}"

    # ========================================================
    # EMAIL HTML TEMPLATE
    # ========================================================

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
    </head>

    <body style="
        margin: 0;
        padding: 20px;
        background-color: #f4f6f9;
        font-family: Arial, sans-serif;
    ">

        <div style="
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid #e5e7eb;
        ">

            <!-- HEADER -->

            <div style="
                background-color: #0f172a;
                padding: 24px;
                text-align: center;
            ">

                <h1 style="
                    margin: 0;
                    color: #ffffff;
                    font-size: 28px;
                ">
                    BudgetBuddy
                </h1>

                <p style="
                    margin: 8px 0 0 0;
                    color: #cbd5e1;
                    font-size: 14px;
                ">
                    Personal Budget Planning
                </p>

            </div>


            <!-- CONTENT -->

            <div style="
                padding: 30px;
                color: #334155;
            ">

                <h2 style="
                    margin-top: 0;
                    color: #0f172a;
                ">
                    {safe_title}
                </h2>


                <p style="
                    font-size: 16px;
                    line-height: 1.6;
                ">
                    Hello
                    <strong>{safe_username}</strong>,
                </p>


                <div style="
                    font-size: 16px;
                    line-height: 1.7;
                    color: #475569;
                ">
                    {safe_message}
                </div>


                <div style="
                    margin-top: 25px;
                    padding: 16px;
                    background-color: #f8fafc;
                    border-left: 4px solid #c8a96b;
                    border-radius: 4px;
                ">

                    <strong style="
                        color: #0f172a;
                    ">
                        BudgetBuddy Notification
                    </strong>

                    <p style="
                        margin: 8px 0 0 0;
                        color: #64748b;
                        font-size: 14px;
                    ">
                        This is an automated notification
                        from your BudgetBuddy account.
                    </p>

                </div>


                <p style="
                    margin-top: 30px;
                    font-size: 15px;
                    color: #475569;
                ">
                    Thank you for using
                    <strong>BudgetBuddy</strong>.
                </p>

            </div>


            <!-- FOOTER -->

            <div style="
                padding: 20px;
                text-align: center;
                background-color: #f8fafc;
                border-top: 1px solid #e5e7eb;
            ">

                <p style="
                    margin: 0;
                    color: #64748b;
                    font-size: 12px;
                ">
                    BudgetBuddy • Personal Budget Planning
                    &amp; Expense Management Platform
                </p>

            </div>

        </div>

    </body>
    </html>
    """

    # ========================================================
    # BREVO API PAYLOAD
    # ========================================================

    payload = {
        "sender": {
            "name": "BudgetBuddy",
            "email": sender_email,
        },

        "to": [
            {
                "email": recipient,
                "name": user.username,
            }
        ],

        "subject": subject,

        "textContent": (
            f"Hello {user.username},\n\n"
            f"{message}\n\n"
            "This is an automated notification "
            "from BudgetBuddy."
        ),

        "htmlContent": html_content,
    }

    # ========================================================
    # BREVO API REQUEST
    # ========================================================

    request = Request(
        "https://api.brevo.com/v3/smtp/email",

        data=json.dumps(
            payload
        ).encode("utf-8"),

        headers={
            "accept": "application/json",
            "api-key": brevo_api_key,
            "content-type": "application/json",
        },

        method="POST",
    )

    # ========================================================
    # SEND EMAIL
    # ========================================================

    try:

        with urlopen(
            request,
            timeout=20
        ) as response:

            status_code = response.getcode()

            response_body = response.read().decode(
                "utf-8",
                errors="replace",
            )

        # ----------------------------------------------------
        # SUCCESS
        # ----------------------------------------------------

        if 200 <= status_code < 300:

            print(
                f"BudgetBuddy notification email accepted "
                f"by Brevo for {recipient}. "
                f"Response: {response_body}"
            )

            return True

        # ----------------------------------------------------
        # UNEXPECTED RESPONSE
        # ----------------------------------------------------

        print(
            f"BudgetBuddy notification email rejected "
            f"for {recipient}: "
            f"HTTP {status_code} - {response_body}"
        )

        return False


    # ========================================================
    # BREVO HTTP ERROR
    # ========================================================

    except HTTPError as error:

        response_body = error.read().decode(
            "utf-8",
            errors="replace",
        )

        print(
            f"BudgetBuddy notification email failed "
            f"for {recipient}: "
            f"Brevo HTTP {error.code} - "
            f"{response_body}"
        )

        return False


    # ========================================================
    # NETWORK ERROR
    # ========================================================

    except URLError as error:

        print(
            f"BudgetBuddy notification email failed "
            f"for {recipient}: "
            f"Network error - {error.reason}"
        )

        return False


    # ========================================================
    # OTHER ERROR
    # ========================================================

    except Exception as error:

        print(
            f"BudgetBuddy notification email failed "
            f"for {recipient}: {error}"
        )

        return False


# ============================================================
# CREATE NOTIFICATION
# ============================================================

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
    Create an in-app notification and optionally
    send an email through Brevo.

    Normal API requests:
        Email runs in a background thread.

    Scheduled commands:
        Can use async_email=False.
    """

    # ========================================================
    # GET USER NOTIFICATION PREFERENCES
    # ========================================================

    preferences, _ = (
        NotificationPreference.objects.get_or_create(
            user=user
        )
    )

    notification_type = (
        notification_type or ""
    ).lower().strip()

    allowed = True

    # ========================================================
    # CHECK USER PREFERENCES
    # ========================================================

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


    # ========================================================
    # STOP IF USER DISABLED THIS NOTIFICATION
    # ========================================================

    if not allowed:

        print(
            f"Notification blocked by user preference: "
            f"{notification_type}"
        )

        return None


    # ========================================================
    # CREATE IN-APP NOTIFICATION
    # ========================================================

    notification = Notification.objects.create(
        user=user,
        title=title,
        message=message,
        notification_type=notification_type,
    )


    # ========================================================
    # DON'T SEND EMAIL IF DISABLED
    # ========================================================

    if not send_email:

        return notification


    # ========================================================
    # EMAIL DELIVERY FUNCTION
    # ========================================================

    def deliver_email():

        # Important when running Django database work
        # inside a background thread.

        close_old_connections()

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
                    "Brevo did not accept or send "
                    "the email."
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
                f"Notification email delivery failed: "
                f"{error}"
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


        finally:

            close_old_connections()


    # ========================================================
    # ASYNC EMAIL
    # ========================================================

    if async_email:

        Thread(
            target=deliver_email,
            daemon=True,
        ).start()


    # ========================================================
    # SYNC EMAIL
    # ========================================================

    else:

        deliver_email()


    return notification