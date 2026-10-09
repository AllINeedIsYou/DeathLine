from fastapi import APIRouter
from DataBase.database import SessionDep
from api.shemas import WorkerCreateSchema, WorkerResponseSchema
from DataBase.models import Workers
from api.service.services_admin import add_time_task_id,del_task_id,del_time_id
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

@admin_router.post('/add_time_and_task/{worker_id}',summary="Добавление дедлайна и задачи")
def add_datetime(session:SessionDep,worker_id:int, task: str|None=None, deadline:datetime|None=None):
    return add_time_task_id(worker_id=worker_id,task=task,deadline=deadline, session=session)

@admin_router.delete('/del_time/{worker_id}',summary='Удаление дедлайна с работника')
def del_time(session:SessionDep,worker_id:int):
    return del_time_id(worker_id=worker_id,session=session)

@admin_router.delete('/del_task/{worker_id}',summary='Удаление задачи с работника')
def del_task(session:SessionDep,worker_id:int):
    return del_task_id(worker_id=worker_id,session=session)
