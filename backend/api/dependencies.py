from DataBase.database import SessionDep
from fastapi import Request
from .service.service_auth import get_user_by_session

def get_current_user(session:SessionDep,request: Request):
    token = request.cookies.get("deathline_session")
    user = get_user_by_session(session=session,token=token)
    return user
