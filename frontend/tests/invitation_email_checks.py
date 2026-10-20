"""Check invitation delivery and token replacement without sending real mail."""
import asyncio
import hashlib
import json
from datetime import datetime, timedelta, timezone
from smtplib import SMTPException
from unittest.mock import patch
from urllib.parse import urlparse

import backend_fixture as fixture
from sqlalchemy.orm import Session
from DataBase.models import Users, Teams, TeamMembers, TeamRole, UserSessions, TeamInvitations

now = datetime.now(timezone.utc)
with Session(fixture.engine) as session:
    session.add_all([
        Users(id=1, name='Admin', username='admin', email='admin@example.com', password_hash='test-only', timezone='UTC', created_at=now, email_verified_at=now),
        Users(id=2, name='Recipient', username='recipient', email='invite@example.com', password_hash='test-only', timezone='UTC', created_at=now, email_verified_at=now),
        Users(id=3, name='Other Admin', username='other', email='other@example.com', password_hash='test-only', timezone='UTC', created_at=now, email_verified_at=now),
    ])
    session.flush()
    session.add_all([Teams(id=10, name='Test Team', timezone='UTC', created_at=now), Teams(id=20, name='Other Team', timezone='UTC', created_at=now)])
    session.flush()
    session.add_all([
        TeamMembers(team_id=10, user_id=1, role=TeamRole.admin, joined_at=now),
        TeamMembers(team_id=20, user_id=3, role=TeamRole.admin, joined_at=now),
    ])
    for user_id, token in ((1, 'test-admin'), (2, 'test-recipient'), (3, 'test-other')):
        session.add(UserSessions(user_id=user_id, token_hash=hashlib.sha256(token.encode()).hexdigest(), created_at=now, expires_at=now + timedelta(days=1)))
    session.commit()

async def request(method, path, body=None, cookie='test-admin'):
    output = []
    headers = [(b'host', b'localhost')]
    if cookie:
        headers.append((b'cookie', f'deathline_session={cookie}'.encode()))
    raw = b'' if body is None else json.dumps(body).encode()
    if body is not None:
        headers.append((b'content-type', b'application/json'))
    async def receive():
        return {'type': 'http.request', 'body': raw, 'more_body': False}
    async def send(message):
        output.append(message)
    await fixture.app({'type': 'http', 'asgi': {'version': '3.0'}, 'http_version': '1.1', 'method': method, 'scheme': 'http', 'path': path, 'raw_path': path.encode(), 'query_string': b'', 'root_path': '', 'server': ('localhost', 80), 'client': ('127.0.0.1', 1), 'headers': headers}, receive, send)
    status = next(message['status'] for message in output if message['type'] == 'http.response.start')
    data = b''.join(message.get('body', b'') for message in output if message['type'] == 'http.response.body')
    return status, json.loads(data) if data else None

async def check():
    with patch('api.service.service_invitations.send_email', side_effect=SMTPException('test transport failure')):
        status, first = await request('POST', '/teams/10/invitations', {'email': 'invite@example.com', 'role': 'employee'})
    assert status == 201 and first['email_sent'] is False
    old_token = urlparse(first['invite_url']).path.split('/')[-1]
    old_id = first['invitation']['id']
    assert (await request('GET', f'/invitations/{old_token}'))[1]['status'] == 'pending'
    status, _ = await request('POST', f'/teams/10/invitations/{old_id}/resend')
    assert status == 429
    assert not fixture.outbox
    with Session(fixture.engine) as session:
        record = session.get(TeamInvitations, old_id)
        assert record.revoked_at is None
        record.created_at = now - timedelta(seconds=61)
        session.commit()
    status, resent = await request('POST', f'/teams/10/invitations/{old_id}/resend')
    assert status == 200 and resent['email_sent'] is True
    new_id = resent['invitation']['id']
    new_token = urlparse(resent['invite_url']).path.split('/')[-1]
    assert new_token != old_token and new_id != old_id
    assert resent['invite_url'] in fixture.outbox[-1]['text']
    assert fixture.outbox[-1]['to'] == 'invite@example.com'
    assert 'Test Team' in fixture.outbox[-1]['subject']
    assert 'Employee' in fixture.outbox[-1]['text']
    assert (await request('GET', f'/invitations/{old_token}'))[1]['status'] == 'revoked'
    assert (await request('GET', f'/invitations/{new_token}'))[1]['status'] == 'pending'
    assert (await request('POST', f'/teams/10/invitations/{old_id}/resend'))[0] == 409
    assert (await request('POST', f'/teams/20/invitations/{new_id}/resend', cookie='test-other'))[0] == 404
    assert (await request('POST', f'/teams/10/invitations/{new_id}/resend', cookie=None))[0] == 401
    assert (await request('POST', f'/invitations/{old_token}/accept', cookie='test-recipient'))[0] == 409
    assert (await request('POST', f'/invitations/{new_token}/accept', cookie='test-recipient'))[0] == 204
    assert (await request('POST', f'/teams/10/invitations/{new_id}/resend'))[0] == 409
    assert (await request('POST', f'/teams/10/invitations/{new_id}/resend', cookie='test-recipient'))[0] == 403
    status, another = await request('POST', '/teams/10/invitations', {'email': 'another@example.com', 'role': 'admin'})
    assert status == 201 and another['email_sent'] is True
    another_id = another['invitation']['id']
    with Session(fixture.engine) as session:
        session.get(TeamInvitations, another_id).created_at = now - timedelta(seconds=61)
        session.commit()
    with patch('api.service.service_invitations.send_email', side_effect=OSError('test offline')):
        status, failed_delivery = await request('POST', f'/teams/10/invitations/{another_id}/resend')
    assert status == 200 and failed_delivery['email_sent'] is False
    fallback = urlparse(failed_delivery['invite_url']).path.split('/')[-1]
    assert (await request('GET', f'/invitations/{fallback}'))[1]['status'] == 'pending'
    with Session(fixture.engine) as session:
        session.get(TeamInvitations, failed_delivery['invitation']['id']).expires_at = now - timedelta(seconds=1)
        session.commit()
    assert (await request('POST', f'/teams/10/invitations/{failed_delivery["invitation"]["id"]}/resend'))[0] == 409
    print('PASS: invitation emails, failed SMTP fallback, resend rotation, cooldown, access checks, acceptance, and expired/revoked protection')

try:
    asyncio.run(check())
finally:
    if hasattr(fixture, 'cleanup'):
        fixture.cleanup()
