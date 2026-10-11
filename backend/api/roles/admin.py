from fastapi import APIRouter
from datetime import datetime
from DataBase.database import SessionDep
from api.shemas import WorkerCreateSchema, WorkerResponseSchema,TaskResponseSchema,TaskCreateSchema,TaskUpdateSchema
from DataBase.models import Workers, Tasks
from api.service.services_admin import add_task,find_task_for_id,task_editing

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

@admin_router.post('/add_task',summary='Создание задачи',response_model=TaskResponseSchema)
def new_add_task(session:SessionDep, task_data: TaskCreateSchema):
    return add_task(session=session,task_data=task_data)

@admin_router.get('/get_all_task',summary="Список всех созданных задач",response_model=list[TaskResponseSchema])
def get_all_tasks(session:SessionDep):
    return  session.query(Tasks).all()

@admin_router.get('/get_all_task/{worker_id}',summary="Возвращение всех задач конкретного работника",response_model=list[TaskResponseSchema])
def get_task_by_id(session:SessionDep,worker_id:int):
    return find_task_for_id(session=session,worker_id=worker_id)
@admin_router.patch('/edit_task',summary='Изменение конкретной задачи',response_model=TaskUpdateSchema)
def edit_task(session:SessionDep, task_id:int, task_data: TaskUpdateSchema):
    return task_editing(session=session,task_id=task_id,task_data=task_data)
