from fastapi import APIRouter, Depends

from DataBase.database import SessionDep
from DataBase.models import Users,TeamMembers


from .dependencies import get_current_user,get_current_team_admin
from .shemas import TeamResponseSchema, TeamCreateSchema, TeamMemberResponseSchema, TaskCreateSchema, \
    TaskResponseSchema, TaskUpdateSchema
from .service.service_team import create_team, get_user_teams, get_team_members, add_task, get_team_tasks, \
     task_editing, complete_task, find_task_for_id,get_task_for_user

teams_router = APIRouter(prefix="/teams",tags=["Teams"])

@teams_router.post('',response_model=TeamResponseSchema,status_code=201,summary='Создать команду')
def team(session:SessionDep,team_data:TeamCreateSchema,user: Users = Depends(get_current_user)):
    return create_team(session=session,team_data=team_data,creator_id=user.id)

@teams_router.get('',response_model=list[TeamResponseSchema],summary="Вернуть командлу")
def get_team(session:SessionDep,user:Users = Depends(get_current_user)):
    return get_user_teams(session=session,user_id=user.id)

@teams_router.get('/{team_id}/members',response_model=list[TeamMemberResponseSchema],summary='Вернуть участников команды')
def get_members(session:SessionDep,member: TeamMembers = Depends(get_current_team_admin)):
    return get_team_members(session=session,team_id=member.team_id)


@teams_router.post('/{team_id}/tasks',summary='Создание задачи',response_model=TaskResponseSchema,status_code=201)
def new_add_task(session:SessionDep, task_data: TaskCreateSchema, member:TeamMembers = Depends(get_current_team_admin)):
    return add_task(session=session,task_data=task_data, team_id=member.team_id)

@teams_router.get('/{team_id}/tasks',summary="Список всех задач команды",response_model=list[TaskResponseSchema])
def get_tasks(session:SessionDep,member: TeamMembers = Depends(get_current_team_admin)):
    return get_team_tasks(session=session,team_id=member.team_id)

@teams_router.get('/{team_id}/tasks/{task_id}',summary="Возвращение конкретной задачи",response_model=TaskResponseSchema)
def get_task(session:SessionDep,task_id:int,team_id:int,user: Users = Depends(get_current_user)):
    return get_task_for_user(session=session,task_id=task_id,user_id=user.id,team_id=team_id)


@teams_router.patch('/{team_id}/tasks/{task_id}',summary='Изменение конкретной задачи',response_model=TaskResponseSchema)
def edit_task(session:SessionDep, task_id:int, task_data: TaskUpdateSchema,member: TeamMembers = Depends(get_current_team_admin)):
    return task_editing(session=session,task_id=task_id,team_id=member.team_id,task_data=task_data)


@teams_router.post('/{team_id}/tasks/{task_id}/complete',summary='Отметка о готовности',response_model=TaskResponseSchema)
def complete_task_by_id(session:SessionDep,team_id:int, task_id:int,user: Users = Depends(get_current_user)):
    return complete_task(session=session,task_id=task_id,user_id=user.id,team_id=team_id)


@teams_router.get('/{team_id}/my-tasks',summary="Возвращение всех задач конкретного работника",response_model=list[TaskResponseSchema])
def get_task_by_id(session:SessionDep,team_id:int,user: Users = Depends(get_current_user)):
    return find_task_for_id(session=session,user_id=user.id,team_id=team_id)
