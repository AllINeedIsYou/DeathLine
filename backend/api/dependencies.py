from .service.service_team import require_team_admin
from DataBase.models import Users

from DataBase.database import SessionDep
from fastapi import Request, Depends
from .service.service_auth import get_user_by_session

def get_current_user(session:SessionDep,request: Request):
    token = request.cookies.get("deathline_session")
    user = get_user_by_session(session=session,token=token)
    return user

def get_current_team_admin(session:SessionDep,team_id:int,user:Users = Depends(get_current_user)):
    return require_team_admin(session=session,team_id=team_id,user_id=user.id)
