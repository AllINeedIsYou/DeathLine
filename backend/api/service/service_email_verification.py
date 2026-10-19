import hashlib
import secrets
from config import FRONTEND_URL
from .service_mail import build_email_message,send_email
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException
from datetime import datetime, timezone, timedelta
from DataBase.database import SessionDep
from DataBase.models import EmailVerificationTokens, Users
from smtplib import SMTPException

def create_email_verification_token(session:SessionDep,user):
    find_user=session.query(Users).filter(Users.id == user.id).populate_existing().with_for_update().first()
    if find_user is None:
        raise HTTPException(status_code=404)

    now = datetime.now(timezone.utc)
    old_tokens=session.query(EmailVerificationTokens).filter(EmailVerificationTokens.user_id==user.id, EmailVerificationTokens.expires_at>now,EmailVerificationTokens.revoked_at.is_(None),EmailVerificationTokens.used_at.is_(None)).all()

    if find_user.email_verified_at is not None:
        raise HTTPException(status_code=409, detail='Email is already verified')

    time_send=session.query(EmailVerificationTokens).filter(EmailVerificationTokens.user_id==user.id).order_by(EmailVerificationTokens.created_at.desc()).first()
    if (time_send is not None) and  (time_send.created_at + timedelta(seconds=60) > now):
        raise HTTPException(status_code=429,detail='Please wait a minute before requesting another email.')

    try:
        for old_token in old_tokens:
            old_token.revoked_at = now

        token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(token.encode()).hexdigest()
        new_EmailVerification=EmailVerificationTokens(
            user_id=find_user.id,
            email=find_user.email,
            token_hash=token_hash,
            used_at=None,
            created_at=now,
            expires_at=now+timedelta(days=1),
            revoked_at=None
        )
        session.add(new_EmailVerification)
        session.commit()
    except IntegrityError:
        session.rollback()
        raise
    session.refresh(new_EmailVerification)
    return new_EmailVerification, token

def find_email_verification_by_token(session:SessionDep,token:str,lock=False):
    token_hash=hashlib.sha256(token.encode()).hexdigest()

    query=session.query(EmailVerificationTokens).filter(EmailVerificationTokens.token_hash==token_hash).populate_existing()
    if lock:
        query=query.with_for_update()
    Emailhash=query.first()
    if Emailhash is None:
        raise HTTPException(status_code=404,detail='Email verification token not found')
    else:
        return Emailhash

def check_email_verification_token(token_record):
    now=datetime.now(timezone.utc)

    if token_record.used_at is not None:
        raise HTTPException(status_code=409,detail='The token has already been used')
    elif token_record.revoked_at is not None:
        raise HTTPException(status_code=409, detail='The token has been revoked')
    elif token_record.expires_at<=now:
        raise HTTPException(status_code=409, detail='The token has expired')
    else:
        return token_record

def confirm_email(session:SessionDep,token):
    token_record=find_email_verification_by_token(session, token)
    find_user=session.query(Users).filter(Users.id==token_record.user_id).populate_existing().with_for_update().first()
    if find_user is None:
        raise HTTPException(status_code=404)
    token_record=find_email_verification_by_token(session,token,lock=True)
    token_record=check_email_verification_token(token_record)
    if find_user.email != token_record.email:
        raise HTTPException(status_code=409, detail='The email address has changed')

    if find_user.email_verified_at is not None:
        raise HTTPException(status_code=409,detail='Email is already verified')
    try:
        now = datetime.now(timezone.utc)
        find_user.email_verified_at=now
        token_record.used_at=now
        session.commit()
    except IntegrityError:
        session.rollback()
        raise
    session.refresh(find_user)
    return find_user

def send_verification_email(user, token):
    verification_url = f"{FRONTEND_URL}/verify-email?token={token}"
    subject='Verify your email — DeathLine'
    text=f'Your email verification link:\n {verification_url}\n This link is valid for 24 hours.'
    message=build_email_message(user.email,subject,text)
    send_email(message)

def request_email_verification(session:SessionDep,user):
    new_EmailVerification, token=create_email_verification_token(session, user)
    try:
        send_verification_email(user,token)
    except(SMTPException,OSError) as error:
        print(type(error).__name__)
        raise HTTPException(status_code=503,detail='Could not send the email. Please try again later.')







