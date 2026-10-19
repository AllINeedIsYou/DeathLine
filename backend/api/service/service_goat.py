from fastapi import HTTPException
from DataBase.database import SessionDep
from api.shemas import TaskStatisticsResponseSchema, GoatMemberResponseSchema, GoatAdminResponseSchema, GoatUserResponseSchema
from api.time_utils import get_month_bounds
from DataBase.models import Tasks, Teams
from .service_team import get_team_members, get_team_member
from .service_statistics import calculate_task_statistics
def calculate_goat_score(statistics: TaskStatisticsResponseSchema):
    total=statistics.completed+statistics.overdue
    if total<5:
        return None
    elif statistics.completed==0:
        return 0.0
    else:
        GOAT=round((statistics.productivity_percent * 0.6 + statistics.on_time_percent * 0.4),1)
        return GOAT

def get_team_tasks_for_month(session: SessionDep, team_id: int, year: int, month: int, timezone_name: str):
    start, end = get_month_bounds(year, month, timezone_name)
    tasks=session.query(Tasks).filter(Tasks.team_id==team_id,Tasks.deadline<end,Tasks.deadline>=start).all()
    return tasks

def group_tasks_by_user(tasks):
    keyandtask={}
    for task in tasks:
        if task.user_id not in keyandtask:
            keyandtask[task.user_id] = []
        keyandtask[task.user_id].append(task)
    return keyandtask

def build_goat_members(session: SessionDep, team_id: int, year: int, month: int, timezone_name: str):
    task_of_month=get_team_tasks_for_month(session, team_id, year, month, timezone_name)
    group_task_of_month=group_tasks_by_user(task_of_month)
    team_members=get_team_members(session, team_id)
    ALL_GOAT=[]
    for member in team_members:
        member_task = group_task_of_month.get(member.user.id, [])
        statistics=calculate_task_statistics(member_task)
        score=calculate_goat_score(statistics)
        new_goat=GoatMemberResponseSchema(
            member_id=member.id,
            user_id=member.user.id,
            name=member.user.name,
            job_title=member.job_title,
            statistics=statistics,
            score=score,
            rank=None
        )
        ALL_GOAT.append(new_goat)
    return ALL_GOAT

def sort_goat_members(members):
    with_score=[]
    without_score=[]
    for member in members:
        if member.score is None:
            without_score.append(member)
        else:
            with_score.append(member)

    with_score.sort(key=lambda member: member.score, reverse=True)

    last_position = None
    last_score = None

    for position,member in enumerate(with_score, start=1):

        if member.score!=last_score:
            member.rank=position
        else:
            member.rank=last_position

        last_position = member.rank
        last_score = member.score

    return  with_score + without_score

def get_admin_goat(session: SessionDep, team_id: int, year: int, month: int):
    find_team=session.query(Teams).filter(Teams.id==team_id).first()
    if find_team is None:
        raise HTTPException(status_code=404,detail='Team not found')
    all_goat=build_goat_members(session,team_id,year,month,find_team.timezone)
    sort_all_goats=sort_goat_members(all_goat)
    response = GoatAdminResponseSchema(
        team_id=find_team.id,
        year=year,
        month=month,
        timezone=find_team.timezone,
        members=sort_all_goats
    )
    return response

def get_user_goat(session: SessionDep, team_id: int, user_id: int, year: int, month: int):
    get_team_member(session, team_id, user_id)
    admin_goat=get_admin_goat(session, team_id, year, month)
    leaders=[]
    my_result = None
    for member in admin_goat.members:
        if member.rank==1:
            leaders.append(member)
        if member.user_id == user_id:
            my_result=member

    if my_result is None:
        raise HTTPException(status_code=404, detail='Member not found')

    return GoatUserResponseSchema(
        team_id=admin_goat.team_id,
        year=admin_goat.year,
        month=admin_goat.month,
        timezone=admin_goat.timezone,
        leaders=leaders,
        my_result=my_result
    )
