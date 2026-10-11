from DataBase.database import SessionDep
from DataBase.models import Workers,Tasks
from fastapi import HTTPException
from datetime import datetime,timezone

from api.shemas import TaskCreateSchema,TaskUpdateSchema

#функция добавления задачи
def add_task(session: SessionDep, task_data:TaskCreateSchema):
    now = datetime.now(timezone.utc)

    worker = session.query(Workers).filter(Workers.id == task_data.worker_id).first()
    if worker is None:
        raise HTTPException(status_code=404, detail="Worker not found")

    #херачим в списк
    task_dict = task_data.model_dump()

    if task_dict['deadline'].tzinfo is None:
        raise HTTPException(status_code=422, detail="Incorrect timezone")
    if task_dict['deadline']<=now:
        raise HTTPException(status_code=422, detail="Incorrect time")

    #вручную присваиваем время сейчас
    task_dict["created_at"]=now
    task_dict['updated_at']=now
    new_task = Tasks(**task_dict)

    session.add(new_task)
    session.commit()
    session.refresh(new_task)
    return new_task

#функция для возвращения всех задач конкретного работника
def find_task_for_id(session: SessionDep, worker_id:int):
    worker=session.query(Workers).filter(Workers.id == worker_id).first()

    if worker is None:
        raise HTTPException(status_code=404, detail="The employee not found.")

    employee_tasks=session.query(Tasks).filter(Tasks.worker_id == worker_id).all()
    return employee_tasks

#функция изменения задачи
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
            raise HTTPException(status_code=422,detail=f"Поле {field} нельзя передать как null")
        if field=="deadline" and  field in update_data:
            if update_data[field].tzinfo is None:
                    raise HTTPException(status_code=422, detail="Incorrect timezone")

    task.updated_at = datetime.now(timezone.utc)

    # key столбец  value новое значение
    for key, value in update_data.items(): #.item как раз и берет парам столбец|новое значение
        #люся,поменяй столбец key на новое значение value в task
        setattr(task, key, value)


    session.commit()
    session.refresh(task)
    return task

#отметка о готовности
def complete_task(session: SessionDep, task_id:int):
    task = session.query(Tasks).filter(Tasks.id == task_id).first()
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.completed_at is not None:
        return task

    task.completed_at = datetime.now(timezone.utc)
    task.updated_at = datetime.now(timezone.utc)

    session.commit()
    session.refresh(task)
    return task

def find_only_task(session: SessionDep, task_id:int):
    task = session.query(Tasks).filter(Tasks.id == task_id).first()
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task












