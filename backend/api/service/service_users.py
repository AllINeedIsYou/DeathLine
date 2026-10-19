from DataBase.database import SessionDep
from ..shemas import UserUpdateSchema
from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

def update_current_user(session:SessionDep,user,user_data:UserUpdateSchema):

    user_dumb=user_data.model_dump(exclude_unset=True)
    if 'name' in user_dumb and user_dumb['name'] is None:
        raise HTTPException(status_code=422,detail='Name cannot be null')
    if 'timezone' in user_dumb and  user_dumb['timezone'] is None:
        raise HTTPException(status_code=422,detail='Time zone cannot be null')
    if not user_dumb:
        return user
    try:
        for key,value in user_dumb.items():
            setattr(user,key,value)
        session.commit()
        session.refresh(user)
    except IntegrityError:
        session.rollback()
        raise
    return user

