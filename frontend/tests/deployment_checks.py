import asyncio
import importlib
import json
from smtplib import SMTPException
from unittest.mock import MagicMock, patch
from urllib.error import HTTPError, URLError

import backend_fixture as fixture
from sqlalchemy.orm import Session
from DataBase.models import Users
from api.service import service_mail


async def request(app, method, path, body=None, cookie=None):
    messages = []
    headers = [(b'host', b'deathline.example')]
    if cookie:
        headers.append((b'cookie', cookie.encode()))
    raw = b'' if body is None else json.dumps(body).encode()
    if body is not None:
        headers.append((b'content-type', b'application/json'))
    async def receive():
        return {'type': 'http.request', 'body': raw, 'more_body': False}
    async def send(message):
        messages.append(message)
    await app({'type': 'http', 'asgi': {'version': '3.0', 'spec_version': '2.4'}, 'http_version': '1.1', 'method': method, 'scheme': 'https', 'path': path, 'raw_path': path.encode(), 'query_string': b'', 'root_path': '', 'server': ('deathline.example', 443), 'client': ('127.0.0.1', 1), 'headers': headers}, receive, send)
    start = next(message for message in messages if message['type'] == 'http.response.start')
    content = b''.join(message.get('body', b'') for message in messages if message['type'] == 'http.response.body')
    return start['status'], dict(start['headers']), content


def check_mail_transport():
    mail = importlib.reload(service_mail)
    response = MagicMock()
    response.__enter__.return_value.status = 201
    with patch.multiple(mail, MAIL_PROVIDER='brevo', BREVO_API_KEY='test-key', MAIL_FROM_EMAIL='sender@example.com'):
        message = mail.build_email_message('recipient@example.com', 'Test subject', 'Test text')
        with patch.object(mail, 'urlopen', return_value=response) as transport:
            mail.send_email(message)
        sent_request = transport.call_args.args[0]
        assert sent_request.full_url == 'https://api.brevo.com/v3/smtp/email'
        payload = json.loads(sent_request.data)
        assert payload['sender']['email'] == 'sender@example.com'
        assert payload['to'][0]['email'] == 'recipient@example.com'
        assert payload['textContent'].strip() == 'Test text'
        assert sent_request.get_header('Api-key') == 'test-key'
        assert transport.call_args.kwargs['timeout'] == 10
        for failure in (HTTPError(sent_request.full_url, 401, 'Unauthorized', {}, None), URLError('Offline')):
            with patch.object(mail, 'urlopen', side_effect=failure):
                try:
                    mail.send_email(message)
                    raise AssertionError('Delivery failure was not reported')
                except SMTPException as error:
                    assert 'test-key' not in str(error)
        with patch.object(mail, 'BREVO_API_KEY', ''), patch.object(mail, 'urlopen') as transport:
            try:
                mail.send_email(message)
                raise AssertionError('Missing credentials were accepted')
            except SMTPException:
                transport.assert_not_called()
    with patch.object(mail, 'MAIL_PROVIDER', 'smtp'), patch.object(mail.smtplib, 'SMTP_SSL') as transport:
        mail.send_email(message)
        transport.return_value.__enter__.return_value.send_message.assert_called_once_with(message)
    print('PASS: Brevo HTTPS payload, failures, missing credentials, and local SMTP compatibility')


async def check_production():
    import config
    import main
    import api.auth as auth
    from init_db import initialize_database
    config.SERVE_FRONTEND = True
    auth.COOKIE_SECURE = True
    app = importlib.reload(main).app
    for path in ('/', '/register/', '/verify-email', '/reset-password', '/invite/example', '/admin/'):
        status, headers, content = await request(app, 'GET', path)
        assert status == 200 and b'<html' in content, path
        assert headers[b'cache-control'] == b'no-cache'
        assert headers[b'referrer-policy'] == b'no-referrer'
    for path in ('/api/no-such-route', '/assets/missing.js', '/brand/missing.png', '/.env', '/../.env', '/api/service/reset_db'):
        assert (await request(app, 'GET', path))[0] == 404, path
    assert (await request(app, 'POST', '/register/'))[0] == 405
    for path in ('/healthz', '/api/healthz'):
        with patch.object(fixture.engine, 'connect', side_effect=AssertionError('Health check queried the database')):
            assert (await request(app, 'GET', path))[0] == 200
    status, _, content = await request(app, 'GET', '/api/openapi.json')
    assert status == 200 and '/auth/login' in json.loads(content)['paths']
    status, _, content = await request(app, 'POST', '/api/auth/register', {'name': 'Deployment Test', 'username': 'deployment-test', 'email': 'deploy@example.com', 'password': 'Deployment!123', 'timezone': 'UTC'})
    assert status == 201, content
    status, headers, _ = await request(app, 'POST', '/api/auth/login', {'username': 'deployment-test', 'password': 'Deployment!123'})
    assert status == 200
    cookie = headers[b'set-cookie'].decode()
    assert all(flag in cookie.lower() for flag in ('secure', 'httponly', 'samesite=lax', 'path=/'))
    session_cookie = cookie.split(';')[0]
    assert (await request(app, 'GET', '/api/auth/me', cookie=session_cookie))[0] == 200
    initialize_database()
    initialize_database()
    with Session(fixture.engine) as session:
        assert session.query(Users).filter(Users.username == 'deployment-test').count() == 1
    status, headers, _ = await request(app, 'POST', '/api/auth/logout', cookie=session_cookie)
    assert status == 204 and b'Max-Age=0' in headers[b'set-cookie']
    assert (await request(app, 'GET', '/api/auth/me', cookie=session_cookie))[0] == 401
    print('PASS: single-origin SPA/API, missing route protection, health checks, HTTPS cookies, auth, and non-destructive schema initialization')


try:
    check_mail_transport()
    asyncio.run(check_production())
finally:
    if hasattr(fixture, 'cleanup'):
        fixture.cleanup()
