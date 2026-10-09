from DataBase.database import SessionDep
from DataBase.models import Workers
from fastapi import HTTPException
from datetime import datetime

def add_time_task_id(worker_id:int, task: str, deadline:datetime, session:SessionDep):
    worker=session.query(Workers).filter(Workers.id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=404,detail='Такого работнитка не существует')
    if worker.deadline is not None:
        raise HTTPException(status_code=404,detail='Дедлайн уже задан')
    if worker.task is not None:
        raise HTTPException(status_code=404,detail='Задание уже задано')

    worker.task=task
    worker.deadline=deadline

    session.add(worker)
    session.commit()
    session.refresh(worker)

    return f'Успешно! Работнику {worker.name}. Вы выдали задачу {worker.task}, с таким дедлайном {worker.deadline}'