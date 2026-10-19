from DataBase.database import SessionDep
from DataBase.models import Tasks, TaskEventType, TaskEvents
from datetime import datetime,timezone

def record_task_event(session: SessionDep, task: Tasks, event_type: TaskEventType):
    session.flush()
    session.refresh(task)

    now=datetime.now(timezone.utc)
    taskevent=TaskEvents(
        task_id=task.id,
        team_id=task.team_id,
        user_id=task.user_id,
        event_type=event_type,
        occurred_at=now,
        deadline=task.deadline,
        completed_at=task.completed_at
    )
    session.add(taskevent)
    return taskevent

def get_team_task_events(session: SessionDep, team_id: int, end: datetime):
    query=session.query(TaskEvents).filter(TaskEvents.team_id==team_id, TaskEvents.occurred_at<end).order_by(TaskEvents.occurred_at.asc(),TaskEvents.id.asc()).all()
    return query

def get_task_states_at(events, at: datetime):
    states = {}
    for event in events:
        if event.occurred_at > at:
            break
        states[event.task_id] = event
    return states
