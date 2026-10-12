from fastapi import APIRouter
from .shemas import UserCreateSchema,UserResponseSchema
from .service.service_auth import register_user
from DataBase.database import SessionDep

auth_router = APIRouter(prefix='/auth', tags=['Auth'])

@auth_router.post('/register', response_model=UserResponseSchema, summary='Регистарция',status_code=201)
def register_new_user(session:SessionDep, user_data:UserCreateSchema):
    return register_user(session=session,user_data=user_data)

