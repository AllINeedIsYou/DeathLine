from fastapi import APIRouter
from DataBase.database import SessionDep
from api.shemas import WorkerCreateSchema, WorkerResponseSchema
from DataBase.models import Workers
from api.service.services_admin import add_time_task_id
from datetime import datetime
admin_router = APIRouter(prefix="/admin", tags=["admin"])

@admin_router.post("/create_worker",summary='Добавление работника')
def create_worker(worker_data: WorkerCreateSchema, session:SessionDep):
    new_worker=Workers(**worker_data.model_dump())

    session.add(new_worker)
    session.commit()
    session.refresh(new_worker)

    return f'Работник создан. {new_worker.name} <3'

@admin_router.get("/get_workers",summary='Получение списка работников', response_model=list[WorkerResponseSchema])
def get_workers(session:SessionDep):
    return session.query(Workers).all()

@admin_router.post('/add_datetime',summary="Добавление дедлайна")
def add_datetime(session:SessionDep,worker_id:int, task: str, deadline:datetime):
    return add_time_task_id(worker_id=worker_id,task=task,deadline=deadline, session=session)