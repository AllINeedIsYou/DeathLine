"""Isolated API for browser integration tests; no writes to application data or real email access."""
import sys
import types
import tempfile
import os
import atexit
import importlib.util
import uuid
from pathlib import Path
from typing import Annotated
from datetime import timezone

from fastapi import Depends
from sqlalchemy import create_engine, DateTime, event, text
from sqlalchemy.orm import DeclarativeBase, Session
from sqlalchemy.types import TypeDecorator

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'backend'))

class Base(DeclarativeBase):
    pass

if os.getenv('DEATHLINE_TEST_POSTGRES') == '1':
    spec = importlib.util.spec_from_file_location('fixture_connection', ROOT / 'backend/DataBase/database.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    original_engine = module.engine
    original_engine.echo = False
    test_name = 'deathline_e2e_' + uuid.uuid4().hex[:16]
    with original_engine.connect().execution_options(isolation_level='AUTOCOMMIT') as connection:
        connection.execute(text(f'CREATE DATABASE "{test_name}"'))
    engine = create_engine(original_engine.url.set(database=test_name))
    cleanup_complete = False
    def cleanup():
        global cleanup_complete
        if cleanup_complete:
            return
        engine.dispose()
        with original_engine.connect().execution_options(isolation_level='AUTOCOMMIT') as connection:
            connection.execute(text(f'DROP DATABASE IF EXISTS "{test_name}" WITH (FORCE)'))
        original_engine.dispose()
        cleanup_complete = True
    atexit.register(cleanup)
else:
    temporary_database = tempfile.TemporaryDirectory(prefix='deathline-integration-')
    engine = create_engine(f'sqlite:///{temporary_database.name}/test.sqlite', connect_args={'check_same_thread': False, 'timeout': 30})
    @event.listens_for(engine, 'connect')
    def foreign_keys(connection, _):
        connection.execute('PRAGMA foreign_keys=ON')
        connection.execute('PRAGMA journal_mode=WAL')

def get_db():
    with Session(engine, autoflush=False) as session:
        yield session

database = types.ModuleType('DataBase.database')
database.Base = Base
database.engine = engine
database.get_db = get_db
database.SessionDep = Annotated[Session, Depends(get_db)]
sys.modules['DataBase.database'] = database
config = types.ModuleType('config')
config.FRONTEND_URL = 'http://127.0.0.1:5173'
config.SMTP_USER = 'fixture@example.com'
config.SMTP_HOST = 'unused.invalid'
config.SMTP_PORT = 465
config.SMTP_PASSWORD = ''
config.SMTP_FROM_NAME = 'DeathLine Test'
config.MAIL_PROVIDER = 'smtp'
config.MAIL_FROM_EMAIL = config.SMTP_USER
config.BREVO_API_KEY = ''
config.DATABASE_URL_UNPOOLED = None
config.COOKIE_SECURE = False
config.SERVE_FRONTEND = False
config.FRONTEND_DIST = ROOT / 'frontend/dist'
config.CORS_ORIGINS = ['http://127.0.0.1:5173', 'http://localhost:5173']
sys.modules['config'] = config

from DataBase.models import Users  # noqa: E402
class UTCDateTime(TypeDecorator):
    impl = DateTime
    cache_ok = True
    def process_bind_param(self, value, dialect):
        return value.astimezone(timezone.utc).replace(tzinfo=None) if value is not None and value.tzinfo is not None else value
    def process_result_value(self, value, dialect):
        return value.replace(tzinfo=timezone.utc) if value is not None and value.tzinfo is None else value

if engine.dialect.name == "sqlite":
    for table in Base.metadata.tables.values():
        for column in table.columns:
            if isinstance(column.type, DateTime) and column.type.timezone:
                column.type = UTCDateTime(timezone=True)
Base.metadata.create_all(engine)

from api.service import service_mail, service_email_verification, service_password_reset, service_invitations  # noqa: E402
outbox = []
def capture(message):
    outbox.append({'to': str(message['To']), 'subject': str(message['Subject']), 'text': message.get_content()})
service_mail.send_email = capture
service_email_verification.send_email = capture
service_password_reset.send_email = capture
service_invitations.send_email = capture

from main import app  # noqa: E402
if os.getenv('DEATHLINE_TEST_POSTGRES') == '1':
    app.router.add_event_handler('shutdown', cleanup)
@app.get('/__test__/outbox', include_in_schema=False)
def get_outbox():
    return outbox
