from django.conf import settings
from django.core.mail import EmailMultiAlternatives

from .models import Notification


def create_notification(user, title, message, notification_type):

    print("===== create_notification() called =====")

    # Save notification in database
    notification = Notification.objects.create(
        user=user,
        title=title,
        message=message,
        notification_type=notification_type,
    )

    # Send email
    if user.email:

        try:

            subject = f"BudgetBuddy | {title}"

            text_content = message

            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; background:#f4f6f9; padding:20px;">

                <div style="
                    max-width:600px;
                    margin:auto;
                    background:white;
                    border-radius:12px;
                    padding:30px;
                    border:1px solid #ddd;
                ">

                    <h2 style="color:#2E86DE;">
                        💰 BudgetBuddy
                    </h2>

                    <hr>

                    <h3>{title}</h3>

                    <p>Hello <b>{user.username}</b>,</p>

                    <p>{message}</p>

                    <br>

                    <div style="
                        background:#F8F9FA;
                        padding:15px;
                        border-left:5px solid #2E86DE;
                    ">

                        <b>This is an automated notification from BudgetBuddy.</b>

                    </div>

                    <br>

                    <p>
                        Thank you for using
                        <b>BudgetBuddy</b>.
                    </p>

                    <hr>

                    <small>
                        BudgetBuddy • Personal Budget Planning &
                        Expense Management Platform
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

            result = email.send()

            print(f"Email sent successfully: {result}")

        except Exception as e:

            print(f"Email sending failed: {e}")

    return notification