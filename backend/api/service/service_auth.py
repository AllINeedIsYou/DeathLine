from pwdlib import PasswordHash
from sqlalchemy.exc import IntegrityError
from psycopg.errors import UniqueViolation
from DataBase.database import SessionDep
from DataBase.models import Users,UserSessions
from fastapi import HTTPException
from datetime import datetime, timezone, timedelta
from api.shemas import UserCreateSchema, UserLoginSchema
import secrets
import hashlib

hasher = PasswordHash.recommended()
#функция хеширования
def hash_password(password:str):
    return hasher.hash(password)
#функция проверки пароля(при входе в аккаунт) сравнивается введенный пароль с тем хешем пароля который уже хранитсья в бд
def verify_password(password:str, hashed_password:str)->bool:
    return hasher.verify(password, hashed_password)


def register_user(session:SessionDep,user_data:UserCreateSchema):
    now=datetime.now(timezone.utc)

    dumb_user=user_data.model_dump(exclude={"password"})
    dumb_user['created_at']=now
    new_user = Users(**dumb_user,password_hash=hash_password(user_data.password))

    try:
        session.add(new_user)
        session.commit()

    except IntegrityError as error:
        session.rollback()

        if isinstance(error.orig, UniqueViolation):
            raise HTTPException(
                status_code=409,
                detail="Логин или почта уже заняты"
            )

        raise

    session.refresh(new_user)
    return new_user

def authenticate_user(session:SessionDep,user_data:UserLoginSchema):
    user=session.query(Users).filter(Users.username==user_data.username).first()
    if user is None:
        raise  HTTPException(
            status_code=401,
            detail='Введен неверный логин или пароль'
         )
    if not verify_password(user_data.password, user.password_hash):
        raise HTTPException(
            status_code=401,
            detail='Введен неверный логин или пароль'
        )
    return user

def create_session(session:SessionDep,user_id:int):
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode()).hexdigest()

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=7)

    new_session = UserSessions(
        user_id=user_id,
        token_hash=token_hash,
        created_at=now,
        expires_at=expires_at
    )

    try:
        session.add(new_session)
        session.commit()
    except IntegrityError:
        session.rollback()
        raise

    return token, expires_at

def get_user_by_session(session:SessionDep, token:str|None):
    if token is None:
        raise HTTPException(
            status_code=401,
        )

    token_hash=hashlib.sha256(token.encode()).hexdigest()
    find_token=session.query(UserSessions).filter(UserSessions.token_hash==token_hash).first()
    if find_token is None:
        raise HTTPException(status_code=401)
    if find_token.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=401)

    find_user=session.query(Users).filter(Users.id==find_token.user_id).first()
    if find_user is None:
        raise HTTPException(status_code=401)
    return find_user

def delete_session(session:SessionDep, token:str|None):
    if token is None:
        return
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    find_token=session.query(UserSessions).filter(UserSessions.token_hash==token_hash).first()
    if find_token is None:
        return
    session.delete(find_token)
    session.commit()
