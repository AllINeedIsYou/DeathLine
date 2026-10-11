from DataBase.database import SessionDep
from DataBase.models import Workers,Tasks
from fastapi import HTTPException
from datetime import datetime

from api.shemas import TaskCreateSchema,TaskUpdateSchema

#функция добавления задачи
def add_task(session: SessionDep, task_data:TaskCreateSchema):
    worker = session.query(Workers).filter(Workers.id == task_data.worker_id).first()
    if worker is None:
        raise HTTPException(status_code=404, detail="Worker not found")
    #херачим в списк
    task_dict = task_data.model_dump()
    #вручную присваиваем время сейчас
    task_dict["created_at"] = datetime.now()
    new_task = Tasks(**task_dict)

    session.add(new_task)
    session.commit()
    session.refresh(new_task)
    return new_task
#функция для возвращения всех задач конкретного работника
def find_task_for_id(session: SessionDep, worker_id:int):
    worker = session.query(Tasks).filter(Tasks.worker_id== worker_id).first()
    if worker is None:
        raise HTTPException(status_code=404, detail="Worker not found")
    all_worker_tasks = session.query(Tasks).filter(Tasks.worker_id == worker_id).all()
    return all_worker_tasks

def task_editing(session: SessionDep, task_id:int, task_data:TaskUpdateSchema):
    task = session.query(Tasks).filter(Tasks.id == task_id).first()
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.completed_at is not None:
        raise HTTPException(status_code=400, detail="Task already completed")

    # получаем словарь из данных, отбрасывая непереданные (None) поля
    update_data = task_data.model_dump(exclude_unset=True)

    for field in ("title", "priority", "deadline"):
        if field in update_data and update_data[field] is None:
            raise HTTPException(
                status_code=422,
                detail=f"Поле {field} нельзя передать как null"
            )

    # key столбец  value новое значение
    for key, value in update_data.items(): #.item как раз и берет парам столбец|новое значение
        #люся,поменяй столбец key на новое значение value в task
        setattr(task, key, value)


    session.commit()
    session.refresh(task)

    return task















# def add_time_task_id(worker_id:int,session:SessionDep,task: str|None=None, deadline:datetime|None=None):
#     worker=session.query(Workers).filter(Workers.id == worker_id).first()
#     if not worker:
#         raise HTTPException(status_code=404,detail='Такого работнитка не существует')
#
#     if task is not None:
#         worker.task = task
#
#     if deadline is not None:
#         worker.deadline = deadline
#         worker.deadline_point = 1
#
#     session.add(worker)
#     session.commit()
#     session.refresh(worker)
#
#     return f'Успешно! Работнику {worker.name}. Вы выдали задачу {worker.task}, с таким дедлайном {worker.deadline}'
#
# def del_time_id(worker_id:int, session:SessionDep):
#     worker = session.query(Workers).filter(Workers.id == worker_id).first()
#     if not worker:
#         raise HTTPException(status_code=404,detail='Такого работнитка не существует')
#     if worker.deadline is None:
#         raise HTTPException(status_code=404, detail='Дедлайн не задан')
#
#     worker.deadline=None
#     worker.deadline_point = None
#     session.add(worker)
#     session.commit()
#     session.refresh(worker)
#     return f'Дедлайн с работника {worker.name} успешно удален'
#
#
# def del_task_id(worker_id: int, session: SessionDep):
#     worker = session.query(Workers).filter(Workers.id == worker_id).first()
#     if not worker:
#         raise HTTPException(status_code=404, detail='Такого работнитка не существует')
#     if worker.task is None:
#         raise HTTPException(status_code=404, detail='Задания не задано')
#
#     worker.task = None
#
#     session.add(worker)
#     session.commit()
#     session.refresh(worker)
#     return f'Задание с работника {worker.name} успешно удалено'