from pwdlib import PasswordHash
from sqlalchemy.exc import IntegrityError
from psycopg.errors import UniqueViolation
from DataBase.database import SessionDep
from DataBase.models import Users
from fastapi import HTTPException
from datetime import datetime,timezone
from api.shemas import UserCreateSchema, UserResponseSchema

hasher = PasswordHash.recommended()
#функция кеширования
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





