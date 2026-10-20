from email.message import EmailMessage
from email.utils import formataddr, parseaddr
from config import SMTP_USER, SMTP_FROM_NAME,SMTP_HOST,SMTP_PASSWORD,SMTP_PORT, MAIL_PROVIDER, MAIL_FROM_EMAIL, BREVO_API_KEY
import json
import smtplib
import ssl
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

def build_email_message(to_email,subject,text):
    message=EmailMessage()

    message['To']=to_email
    message['Subject']=subject
    message['From']=formataddr((SMTP_FROM_NAME, MAIL_FROM_EMAIL))

    message.set_content(text)

    return message

def send_email(message):
    if MAIL_PROVIDER == "brevo":
        if not BREVO_API_KEY or not MAIL_FROM_EMAIL:
            raise smtplib.SMTPException("Configure BREVO_API_KEY and MAIL_FROM_EMAIL")
        sender_name, sender_email = parseaddr(message['From'])
        recipient_name, recipient_email = parseaddr(message['To'])
        payload = {
            "sender": {"name": sender_name, "email": sender_email},
            "to": [{"email": recipient_email, "name": recipient_name or recipient_email}],
            "subject": str(message['Subject']),
            "textContent": message.get_content(),
        }
        request = Request(
            "https://api.brevo.com/v3/smtp/email",
            data=json.dumps(payload).encode("utf-8"),
            headers={"api-key": BREVO_API_KEY, "Content-Type": "application/json", "Accept": "application/json"},
            method="POST",
        )
        try:
            with urlopen(request, timeout=10, context=ssl.create_default_context()) as response:
                if response.status != 201:
                    raise smtplib.SMTPException("Email provider did not accept the message")
        except HTTPError as error:
            error.close()
            raise smtplib.SMTPException(f"Email provider returned HTTP {error.code}") from None
        except URLError:
            raise smtplib.SMTPException("Could not connect to the email provider") from None
        return
    if MAIL_PROVIDER != "smtp":
        raise smtplib.SMTPException("Unsupported MAIL_PROVIDER")
    context = ssl.create_default_context()
    with smtplib.SMTP_SSL(
        SMTP_HOST,
        SMTP_PORT,
        context=context,
        timeout=10
    ) as server:
        server.login(SMTP_USER,SMTP_PASSWORD)
        server.send_message(message)
