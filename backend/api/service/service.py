
from fastapi import APIRouter
from DataBase.database import Base, engine


service_router=APIRouter(prefix='/service',tags=['Service'])

@service_router.post('/reset_db', summary='Reset the database: delete all data and recreate tables')
def reset_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    return {"message": "Database reset complete!"}


