from backend.DataBase.database import SessionDep
from backend.DataBase.models import Workers
from fastapi import HTTPException
from datetime import datetime

def add_time_task_id(worker_id:int,session:SessionDep,task: str|None=None, deadline:datetime|None=None):
    worker=session.query(Workers).filter(Workers.id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=404,detail='Такого работнитка не существует')

    if task is not None:
        worker.task = task

    if deadline is not None:
        worker.deadline = deadline
        worker.deadline_point = 1

    session.add(worker)
    session.commit()
    session.refresh(worker)

    return f'Успешно! Работнику {worker.name}. Вы выдали задачу {worker.task}, с таким дедлайном {worker.deadline}'

def del_time_id(worker_id:int, session:SessionDep):
    worker = session.query(Workers).filter(Workers.id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=404,detail='Такого работнитка не существует')
    if worker.deadline is None:
        raise HTTPException(status_code=404, detail='Дедлайн не задан')

    worker.deadline=None
    worker.deadline_point = None
    session.add(worker)
    session.commit()
    session.refresh(worker)
    return f'Дедлайн с работника {worker.name} успешно удален'


def del_task_id(worker_id: int, session: SessionDep):
    worker = session.query(Workers).filter(Workers.id == worker_id).first()
    if not worker:
        raise HTTPException(status_code=404, detail='Такого работнитка не существует')
    if worker.task is None:
        raise HTTPException(status_code=404, detail='Задания не задано')

    worker.task = None

    session.add(worker)
    session.commit()
    session.refresh(worker)
    return f'Задание с работника {worker.name} успешно удалено'