import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(env_path)

SMTP_USER = os.getenv("SMTP_USER")
SMTP_HOST=os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT"))
SMTP_PASSWORD=os.getenv("SMTP_PASSWORD")
SMTP_FROM_NAME=os.getenv("SMTP_FROM_NAME")
FRONTEND_URL=os.getenv("FRONTEND_URL")