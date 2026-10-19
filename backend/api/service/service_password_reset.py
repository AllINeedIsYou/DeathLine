import hashlib
import secrets
from smtplib import SMTPException
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError
from .service_auth import hash_password
from DataBase.database import SessionDep
from DataBase.models import Users, UserSessions, PasswordResetTokens
from datetime import datetime, timezone, timedelta
from config import FRONTEND_URL
from .service_mail import build_email_message,send_email


def find_password_reset_by_token(session:SessionDep,token,lock=False):
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    query=session.query(PasswordResetTokens).filter(PasswordResetTokens.token_hash==token_hash).populate_existing()
    if lock:
        query=query.with_for_update()
    find_token=query.first()
    if find_token is None:
        raise HTTPException(status_code=404, detail='Password reset token not found.')
    else:
        return find_token

def check_password_reset_token(token_record):
    now= datetime.now(timezone.utc)

    if token_record.used_at is not None:
        raise HTTPException(status_code=409,detail='The token has already been used.')
    elif token_record.revoked_at is not None:
        raise HTTPException(status_code=409,detail='The token has been revoked.')
    elif token_record.expires_at<=now:
        raise HTTPException(status_code=409,detail='The token has expired.')
    else:
        return token_record

def send_password_reset_email(user,token):
    URL=f'{FRONTEND_URL}/reset-password?token={token}'
    to_email=user.email
    subject='Reset your password — DeathLine'
    text=f'Follow this link to reset your password:\n{URL}\nThis link is valid for 1 hour.'
    message=build_email_message(to_email, subject, text)
    send_email(message)

def create_password_reset_token(session:SessionDep,user):
    find_user=session.query(Users).filter(Users.id==user.id).populate_existing().with_for_update().first()
    if find_user is None:
        raise HTTPException(status_code=404)
    now=datetime.now(timezone.utc)
    old_tokens=session.query(PasswordResetTokens).filter(PasswordResetTokens.user_id==user.id,PasswordResetTokens.expires_at>now,PasswordResetTokens.revoked_at.is_(None),PasswordResetTokens.used_at.is_(None)).all()

    time_send=session.query(PasswordResetTokens).filter(PasswordResetTokens.user_id==user.id).order_by(PasswordResetTokens.created_at.desc()).first()
    if (time_send is not None) and (time_send.created_at+timedelta(seconds=60)>now):
        raise HTTPException(status_code=429,detail='Please wait a minute before requesting another email.')

    try:
        for old_token in old_tokens:
            old_token.revoked_at = now
        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        new_password_reset_token=PasswordResetTokens(
            user_id=find_user.id,
            email=find_user.email,
            token_hash=token_hash,
            used_at=None,
            created_at=now,
            expires_at=now + timedelta(hours=1),
            revoked_at=None
        )

        session.add(new_password_reset_token)
        session.commit()
    except IntegrityError:
        session.rollback()
        raise
    session.refresh(new_password_reset_token)
    return new_password_reset_token,token

def request_password_reset(session:SessionDep,email):
    user=session.query(Users).filter(Users.email==email).first()
    if user is None:
        return
    else:
        try:
            new_password_reset_token, token=create_password_reset_token(session, user)
        except HTTPException as error:
            if error.status_code==429:
                return
            raise

        try:
            send_password_reset_email(user, token)
        except (SMTPException, OSError) as error:
            print(type(error).__name__)
    return

def reset_password(session:SessionDep,token,new_password):
    token_record=find_password_reset_by_token(session, token)
    user=session.query(Users).filter(Users.id==token_record.user_id).populate_existing().with_for_update().first()

    if user is None:
        raise HTTPException(status_code=404)

    token_record=find_password_reset_by_token(session, token,lock=True)
    check_password_reset_token(token_record)

    if user.email!=token_record.email:
        raise HTTPException(status_code=409,detail='The email address has changed')

    try:
        password_hash=hash_password(new_password)
        user.password_hash=password_hash

        now = datetime.now(timezone.utc)
        token_record.used_at=now

        user_sessions=session.query(UserSessions).filter(UserSessions.user_id==user.id).all()
        for user_session in user_sessions:
            session.delete(user_session)

        old_tokens=session.query(PasswordResetTokens).filter(PasswordResetTokens.user_id==user.id,PasswordResetTokens.used_at.is_(None),PasswordResetTokens.revoked_at.is_(None), PasswordResetTokens.expires_at>now,PasswordResetTokens.id != token_record.id).all()
        for old_token in old_tokens:
            old_token.revoked_at=now

        session.commit()
    except IntegrityError:
        session.rollback()
        raise
