from fastapi import APIRouter, Response,Request,Depends
from .shemas import UserCreateSchema,UserResponseSchema,UserLoginSchema
from .service.service_auth import register_user,authenticate_user,create_session,get_user_by_session,delete_session
from DataBase.database import SessionDep
from .dependencies import get_current_user
from DataBase.models import Users

auth_router = APIRouter(prefix='/auth', tags=['Auth'])

@auth_router.post('/register', response_model=UserResponseSchema, summary='Регистарция',status_code=201)
def register_new_user(session:SessionDep, user_data:UserCreateSchema):
    return register_user(session=session,user_data=user_data)

@auth_router.post('/login', response_model=UserResponseSchema, summary='Вход')
def login(session:SessionDep, user_data:UserLoginSchema, response:Response):
    user = authenticate_user(session=session,user_data=user_data)

    token,expires_at=create_session(session=session,user_id=user.id)
    response.set_cookie(
        key="deathline_session",
        value=token,
        expires=expires_at,
        httponly=True,
        samesite="lax",
        secure=False,
        path="/"
    )
    return user

@auth_router.get('/me', response_model=UserResponseSchema,summary="Поиск по токену пользователя")
def find_me_by_token(user: Users = Depends(get_current_user)):
    return user

@auth_router.post('/logout', summary='Выход', status_code=204)
def logout(session:SessionDep, response:Response,request: Request):
    token=request.cookies.get("deathline_session")
    delete_session(session=session,token=token)
    response.delete_cookie(key="deathline_session",path="/")
    return


