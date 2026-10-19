from datetime import datetime,timezone

from DataBase.database import SessionDep
from api.shemas import TaskStatisticsResponseSchema
from .service_team import find_task_for_id,get_team_tasks,get_team_member_profile
def calculate_task_statistics(tasks, at: datetime | None = None):
    total=0
    active=0
    completed=0
    overdue=0
    completed_in_time=0
    productivity=0

    now=at if at is not None else datetime.now(timezone.utc)

    for task in tasks:
        total+=1
        if task.completed_at is not None and task.completed_at <= now:
            completed+=1
            if task.completed_at<=task.deadline:
                completed_in_time+=1
        elif task.deadline<=now:
            overdue+=1
        else:
            active+=1
    if completed + overdue==0:
        productivity=None
    else:
        productivity=round(completed * 100 / (completed + overdue),1)
    if completed==0:
        procent=None
    else:
        procent = round((completed_in_time * 100) / completed,1)
    response=TaskStatisticsResponseSchema(
        total=total,
        active=active,
        completed=completed,
        overdue=overdue,
        on_time_percent=procent,
        productivity_percent=productivity

    )
    return response

def get_my_task_statistics(session:SessionDep,team_id,user_id):
    tasks=find_task_for_id(session, user_id, team_id)
    calculate=calculate_task_statistics(tasks)
    return calculate

def get_team_task_statistics(session:SessionDep,team_id):
    tasks=get_team_tasks(session, team_id)
    calculate = calculate_task_statistics(tasks)
    return calculate

def get_member_task_statistics(session:SessionDep,team_id,employee_member_id):
    profile=get_team_member_profile(session, team_id, employee_member_id)# The team member's profile.
    tasks_user=find_task_for_id(session,profile.user.id,profile.team_id)
    calculate=calculate_task_statistics(tasks_user)
    return calculate
