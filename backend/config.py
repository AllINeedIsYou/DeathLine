import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(env_path)

SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "DeathLine")
FRONTEND_URL = (os.getenv("FRONTEND_URL") or os.getenv("RENDER_EXTERNAL_URL") or "http://127.0.0.1:5173").rstrip("/")
DATABASE_URL = os.getenv("DATABASE_URL")
DATABASE_URL_UNPOOLED = os.getenv("DATABASE_URL_UNPOOLED")
MAIL_PROVIDER = os.getenv("MAIL_PROVIDER", "smtp").lower()
MAIL_FROM_EMAIL = os.getenv("MAIL_FROM_EMAIL") or SMTP_USER
BREVO_API_KEY = os.getenv("BREVO_API_KEY", "")
COOKIE_SECURE = os.getenv("COOKIE_SECURE", str(FRONTEND_URL.startswith("https://"))).lower() == "true"
SERVE_FRONTEND = os.getenv("SERVE_FRONTEND", "false").lower() == "true"
FRONTEND_DIST = Path(os.getenv("FRONTEND_DIST", str(Path(__file__).resolve().parent.parent / "frontend" / "dist")))
CORS_ORIGINS = [origin.strip() for origin in os.getenv("CORS_ORIGINS", FRONTEND_URL).split(",") if origin.strip()]
if not SERVE_FRONTEND and "CORS_ORIGINS" not in os.environ:
    CORS_ORIGINS = ["http://127.0.0.1:5173", "http://localhost:5173"]
