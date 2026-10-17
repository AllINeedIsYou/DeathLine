from email.message import EmailMessage
from email.utils import formataddr
from config import SMTP_USER, SMTP_FROM_NAME,SMTP_HOST,SMTP_PASSWORD,SMTP_PORT
import smtplib
import ssl

def build_email_message(to_email,subject,text):
    message=EmailMessage()

    message['To']=to_email
    message['Subject']=subject
    message['From']=formataddr((SMTP_FROM_NAME, SMTP_USER))

    message.set_content(text)

    return message

def send_email(message):
    context = ssl.create_default_context()
    with smtplib.SMTP_SSL(
        SMTP_HOST,
        SMTP_PORT,
        context=context,
        timeout=10
    ) as server:
        server.login(SMTP_USER,SMTP_PASSWORD)
        server.send_message(message)