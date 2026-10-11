from fastapi import APIRouter
from backend.DataBase.database import Base, engine


service_router=APIRouter(prefix='/service')

@service_router.post('/reset_db')
def reset_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    return {"message": "База данных сброшена!"}

