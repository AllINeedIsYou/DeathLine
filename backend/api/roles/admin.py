from fastapi import APIRouter
from DataBase.database import SessionDep
from api.shemas import TaskResponseSchema,TaskCreateSchema,TaskUpdateSchema,UserResponseSchema
from DataBase.models import Tasks,Users
from api.service.services_admin import add_task,find_task_for_id,task_editing,complete_task,find_only_task


admin_router = APIRouter(prefix="/admin", tags=["admin"])

@admin_router.get('/get_users',summary='Вывод всех юзреров',response_model=list[UserResponseSchema])
def get_users(session:SessionDep):
    return session.query(Users).all()

@admin_router.post('/add_task',summary='Создание задачи',response_model=TaskResponseSchema)
def new_add_task(session:SessionDep, task_data: TaskCreateSchema):
    return add_task(session=session,task_data=task_data)

@admin_router.get('/get_all_task',summary="Список всех созданных задач",response_model=list[TaskResponseSchema])
def get_all_tasks(session:SessionDep):
    return  session.query(Tasks).all()

@admin_router.get('/get_all_task/{user_id}',summary="Возвращение всех задач конкретного работника",response_model=list[TaskResponseSchema])
def get_task_by_id(session:SessionDep,user_id:int):
    return find_task_for_id(session=session,user_id=user_id)

@admin_router.patch('/edit_task',summary='Изменение конкретной задачи',response_model=TaskResponseSchema)
def edit_task(session:SessionDep, task_id:int, task_data: TaskUpdateSchema):
    return task_editing(session=session,task_id=task_id,task_data=task_data)

@admin_router.patch('/complete_task/{task_id}',summary='Отметка о готовности',response_model=TaskResponseSchema)
def complete_task_by_id(session:SessionDep, task_id:int):
    return complete_task(session=session,task_id=task_id)

@admin_router.get('/get_task/{task_id}',summary="Возвращение конкретной задачи",response_model=TaskResponseSchema)
def get_task(session:SessionDep,task_id:int):
    return find_only_task(session=session,task_id=task_id)
