from fastapi import APIRouter, Depends
from DataBase.database import SessionDep
from api.shemas import TaskResponseSchema,TaskCreateSchema,TaskUpdateSchema,UserResponseSchema
from DataBase.models import Tasks,Users,TeamMembers



admin_router = APIRouter(prefix="/admin", tags=["admin"])






