from fastapi import APIRouter, Depends

from DataBase.database import SessionDep
from DataBase.models import Users,TeamMembers
from .dependencies import get_current_user,get_current_team_admin

from .shemas import TeamResponseSchema, TeamCreateSchema, TeamMemberResponseSchema, TaskCreateSchema, \
    TaskResponseSchema, TaskUpdateSchema, MyTeamResponseSchema, TeamInvitationLinkResponseSchema, \
    TeamInvitationCreateSchema, TeamInvitationListItemSchema, PrivateWorkerNoteResponseSchema, \
    PrivateWorkerNoteWriteSchema, TeamMemberUpdateSchema

from .service.service_team import create_team, get_user_teams, get_team_members, add_task, get_team_tasks, \
    task_editing, complete_task, find_task_for_id, get_task_for_user, get_team_member_profile, update_team_member
from .service.service_invitations import create_team_invitation, get_team_invitations, revoke_team_invitation
from .service.service_notes import get_private_worker_note,save_private_worker_note,delete_private_worker_note

teams_router = APIRouter(prefix="/teams",tags=["Teams"])

@teams_router.post('',response_model=TeamResponseSchema,status_code=201,summary='Создать команду и стать её администратором')
def team(session:SessionDep,team_data:TeamCreateSchema,user: Users = Depends(get_current_user)):
    return create_team(session=session,team_data=team_data,creator_id=user.id)

@teams_router.get('',response_model=list[MyTeamResponseSchema],summary='Получить команды, в которых состоит текущий пользователь')
def get_team(session:SessionDep,user:Users = Depends(get_current_user)):
    return get_user_teams(session=session,user_id=user.id)

@teams_router.get('/{team_id}/members',response_model=list[TeamMemberResponseSchema],summary='Получить участников команды')
def get_members(session:SessionDep,member: TeamMembers = Depends(get_current_team_admin)):
    return get_team_members(session=session,team_id=member.team_id)


@teams_router.post('/{team_id}/tasks',summary='Создать задачу для участника команды',response_model=TaskResponseSchema,status_code=201)
def new_add_task(session:SessionDep, task_data: TaskCreateSchema, member:TeamMembers = Depends(get_current_team_admin)):
    return add_task(session=session,task_data=task_data, team_id=member.team_id)

@teams_router.get('/{team_id}/tasks',summary='Получить все задачи команды',response_model=list[TaskResponseSchema])
def get_tasks(session:SessionDep,member: TeamMembers = Depends(get_current_team_admin)):
    return get_team_tasks(session=session,team_id=member.team_id)

@teams_router.get('/{team_id}/tasks/{task_id}',summary='Получить задачу, доступную текущему пользователю',response_model=TaskResponseSchema)
def get_task(session:SessionDep,task_id:int,team_id:int,user: Users = Depends(get_current_user)):
    return get_task_for_user(session=session,task_id=task_id,user_id=user.id,team_id=team_id)


@teams_router.patch('/{team_id}/tasks/{task_id}',summary='Изменить задачу команды',response_model=TaskResponseSchema)
def edit_task(session:SessionDep, task_id:int, task_data: TaskUpdateSchema,member: TeamMembers = Depends(get_current_team_admin)):
    return task_editing(session=session,task_id=task_id,team_id=member.team_id,task_data=task_data)


@teams_router.post('/{team_id}/tasks/{task_id}/complete',summary='Отметить свою задачу выполненной',response_model=TaskResponseSchema)
def complete_task_by_id(session:SessionDep,team_id:int, task_id:int,user: Users = Depends(get_current_user)):
    return complete_task(session=session,task_id=task_id,user_id=user.id,team_id=team_id)


@teams_router.get('/{team_id}/my-tasks',summary='Получить свои задачи в команде',response_model=list[TaskResponseSchema])
def get_task_by_id(session:SessionDep,team_id:int,user: Users = Depends(get_current_user)):
    return find_task_for_id(session=session,user_id=user.id,team_id=team_id)

@teams_router.post('/{team_id}/invitations',response_model=TeamInvitationLinkResponseSchema,status_code=201,summary='Создать приглашение в команду и получить ссылку')
def invite_in_team(session:SessionDep,team_data:TeamInvitationCreateSchema,member: TeamMembers = Depends(get_current_team_admin)):
    invation,token=create_team_invitation(session=session,team_data=team_data,team_id=member.team_id,creator_id=member.user_id)
    invite_url=f'http://127.0.0.1:5173/invite/{token}'

    return TeamInvitationLinkResponseSchema(
        invitation=invation,
        invite_url=invite_url
    )
@teams_router.get('/{team_id}/invitations',response_model=list[TeamInvitationListItemSchema], summary='Получить приглашения команды с их статусами')
def get_all_invitations(session:SessionDep,member: TeamMembers = Depends(get_current_team_admin)):
    return get_team_invitations(session=session,team_id=member.team_id)

@teams_router.delete('/{team_id}/invitations/{invitation_id}',status_code=204, summary='Отменить приглашение в команду')
def del_invite(session:SessionDep,invitation_id:int,member:TeamMembers=Depends(get_current_team_admin)):
    revoke_team_invitation(session=session,team_id=member.team_id,invitation_id=invitation_id)

@teams_router.get('/{team_id}/members/{employee_member_id}/private-note',response_model=PrivateWorkerNoteResponseSchema|None,summary='Получить свою личную заметку об участнике команды')
def read_private_worker_note(session:SessionDep,employee_member_id:int,admin:TeamMembers=Depends(get_current_team_admin)):
    return get_private_worker_note(session,admin.team_id,employee_member_id,admin.id)

@teams_router.put('/{team_id}/members/{employee_member_id}/private-note',response_model=PrivateWorkerNoteResponseSchema,summary='Создать или обновить свою личную заметку об участнике команды')
def create_note(session:SessionDep,note_data:PrivateWorkerNoteWriteSchema,employee_member_id:int,admin:TeamMembers=Depends(get_current_team_admin)):
    return save_private_worker_note(session,admin.team_id,employee_member_id,admin.id,note_data)

@teams_router.delete('/{team_id}/members/{employee_member_id}/private-note',status_code=204,summary='Удалить свою личную заметку об участнике команды')
def del_note(session:SessionDep,employee_member_id:int,admin:TeamMembers=Depends(get_current_team_admin)):
    delete_private_worker_note(session,admin.team_id,employee_member_id,admin.id)

@teams_router.get('/{team_id}/members/{employee_member_id}',response_model=TeamMemberResponseSchema, summary='Получить карточку участника команды')
def get_user(session:SessionDep,employee_member_id:int,admin:TeamMembers=Depends(get_current_team_admin)):
    return get_team_member_profile(session,admin.team_id,employee_member_id)
@teams_router.patch('/{team_id}/members/{employee_member_id}', response_model=TeamMemberResponseSchema, summary='Изменить или очистить должность участника команды')
def update_job_title(session:SessionDep,member_data:TeamMemberUpdateSchema,employee_member_id:int,admin:TeamMembers=Depends(get_current_team_admin)):
    return update_team_member(session,admin.team_id,employee_member_id,member_data)