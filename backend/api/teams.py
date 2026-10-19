from config import FRONTEND_URL
from fastapi import APIRouter, Depends,Query

from DataBase.database import SessionDep
from DataBase.models import Users,TeamMembers
from .dependencies import get_current_user,get_current_team_admin

from .shemas import TeamResponseSchema, TeamCreateSchema, TeamMemberResponseSchema, TaskCreateSchema, \
    TaskResponseSchema, TaskUpdateSchema, MyTeamResponseSchema, TeamInvitationLinkResponseSchema, \
    TeamInvitationCreateSchema, TeamInvitationListItemSchema, PrivateWorkerNoteResponseSchema, \
    PrivateWorkerNoteWriteSchema, TeamMemberUpdateSchema, TaskStatisticsResponseSchema,GoatAdminResponseSchema,GoatUserResponseSchema,TaskHistoryResponseSchema
from .service.service_statistics import get_my_task_statistics,get_team_task_statistics,get_member_task_statistics
from .service.service_team import create_team, get_user_teams, get_team_members, add_task, get_team_tasks, \
    task_editing, complete_task, find_task_for_id, get_task_for_user, get_team_member_profile, update_team_member
from .service.service_invitations import create_team_invitation, get_team_invitations, revoke_team_invitation, resend_team_invitation, send_team_invitation_email
from .service.service_notes import get_private_worker_note,save_private_worker_note,delete_private_worker_note
from .service.service_goat import get_admin_goat,get_user_goat
from .service.service_charts import get_team_task_history, get_member_task_history
teams_router = APIRouter(prefix="/teams",tags=["Teams"])

@teams_router.post('',response_model=TeamResponseSchema,status_code=201,summary='Create a team and become its administrator')
def team(session:SessionDep,team_data:TeamCreateSchema,user: Users = Depends(get_current_user)):
    return create_team(session=session,team_data=team_data,creator_id=user.id)

@teams_router.get('',response_model=list[MyTeamResponseSchema],summary='Get the current user’s teams')
def get_team(session:SessionDep,user:Users = Depends(get_current_user)):
    return get_user_teams(session=session,user_id=user.id)

@teams_router.get('/{team_id}/members',response_model=list[TeamMemberResponseSchema],summary='Get team members')
def get_members(session:SessionDep,member: TeamMembers = Depends(get_current_team_admin)):
    return get_team_members(session=session,team_id=member.team_id)


@teams_router.post('/{team_id}/tasks',summary='Create a task for a team member',response_model=TaskResponseSchema,status_code=201)
def new_add_task(session:SessionDep, task_data: TaskCreateSchema, member:TeamMembers = Depends(get_current_team_admin)):
    return add_task(session=session,task_data=task_data, team_id=member.team_id)

@teams_router.get('/{team_id}/tasks',summary='Get all team tasks',response_model=list[TaskResponseSchema])
def get_tasks(session:SessionDep,member: TeamMembers = Depends(get_current_team_admin)):
    return get_team_tasks(session=session,team_id=member.team_id)

@teams_router.get('/{team_id}/tasks/{task_id}',summary='Get a task available to the current user',response_model=TaskResponseSchema)
def get_task(session:SessionDep,task_id:int,team_id:int,user: Users = Depends(get_current_user)):
    return get_task_for_user(session=session,task_id=task_id,user_id=user.id,team_id=team_id)


@teams_router.patch('/{team_id}/tasks/{task_id}',summary='Update a team task',response_model=TaskResponseSchema)
def edit_task(session:SessionDep, task_id:int, task_data: TaskUpdateSchema,member: TeamMembers = Depends(get_current_team_admin)):
    return task_editing(session=session,task_id=task_id,team_id=member.team_id,task_data=task_data)


@teams_router.post('/{team_id}/tasks/{task_id}/complete',summary='Mark your task as completed',response_model=TaskResponseSchema)
def complete_task_by_id(session:SessionDep,team_id:int, task_id:int,user: Users = Depends(get_current_user)):
    return complete_task(session=session,task_id=task_id,user_id=user.id,team_id=team_id)


@teams_router.get('/{team_id}/my-tasks',summary='Get your tasks in a team',response_model=list[TaskResponseSchema])
def get_task_by_id(session:SessionDep,team_id:int,user: Users = Depends(get_current_user)):
    return find_task_for_id(session=session,user_id=user.id,team_id=team_id)

def invitation_response(session: SessionDep, invitation, token):
    invite_url = f'{FRONTEND_URL.rstrip("/")}/invite/{token}'
    email_sent = send_team_invitation_email(session, invitation, invite_url)
    return TeamInvitationLinkResponseSchema(invitation=invitation, invite_url=invite_url, email_sent=email_sent)


@teams_router.post('/{team_id}/invitations',response_model=TeamInvitationLinkResponseSchema,status_code=201,summary='Create a team invitation and email its link')
def invite_in_team(session:SessionDep,team_data:TeamInvitationCreateSchema,member: TeamMembers = Depends(get_current_team_admin)):
    invation,token=create_team_invitation(session=session,team_data=team_data,team_id=member.team_id,creator_id=member.user_id)
    return invitation_response(session, invation, token)


@teams_router.post('/{team_id}/invitations/{invitation_id}/resend',response_model=TeamInvitationLinkResponseSchema,summary='Replace a pending invitation link and resend its email')
def resend_invitation(session:SessionDep,invitation_id:int,member:TeamMembers=Depends(get_current_team_admin)):
    invitation,token=resend_team_invitation(session,member.team_id,invitation_id,member.user_id)
    return invitation_response(session,invitation,token)

@teams_router.get('/{team_id}/invitations',response_model=list[TeamInvitationListItemSchema], summary='Get team invitations and their statuses')
def get_all_invitations(session:SessionDep,member: TeamMembers = Depends(get_current_team_admin)):
    return get_team_invitations(session=session,team_id=member.team_id)

@teams_router.delete('/{team_id}/invitations/{invitation_id}',status_code=204, summary='Revoke a team invitation')
def del_invite(session:SessionDep,invitation_id:int,member:TeamMembers=Depends(get_current_team_admin)):
    revoke_team_invitation(session=session,team_id=member.team_id,invitation_id=invitation_id)

@teams_router.get('/{team_id}/members/{employee_member_id}/private-note',response_model=PrivateWorkerNoteResponseSchema|None,summary='Get your private note about a team member')
def read_private_worker_note(session:SessionDep,employee_member_id:int,admin:TeamMembers=Depends(get_current_team_admin)):
    return get_private_worker_note(session,admin.team_id,employee_member_id,admin.id)

@teams_router.put('/{team_id}/members/{employee_member_id}/private-note',response_model=PrivateWorkerNoteResponseSchema,summary='Create or update your private note about a team member')
def create_note(session:SessionDep,note_data:PrivateWorkerNoteWriteSchema,employee_member_id:int,admin:TeamMembers=Depends(get_current_team_admin)):
    return save_private_worker_note(session,admin.team_id,employee_member_id,admin.id,note_data)

@teams_router.delete('/{team_id}/members/{employee_member_id}/private-note',status_code=204,summary='Delete your private note about a team member')
def del_note(session:SessionDep,employee_member_id:int,admin:TeamMembers=Depends(get_current_team_admin)):
    delete_private_worker_note(session,admin.team_id,employee_member_id,admin.id)

@teams_router.get('/{team_id}/members/{employee_member_id}',response_model=TeamMemberResponseSchema, summary='Get a team member’s profile')
def get_user(session:SessionDep,employee_member_id:int,admin:TeamMembers=Depends(get_current_team_admin)):
    return get_team_member_profile(session,admin.team_id,employee_member_id)
@teams_router.patch('/{team_id}/members/{employee_member_id}', response_model=TeamMemberResponseSchema, summary='Update or clear a team member’s job title')
def update_job_title(session:SessionDep,member_data:TeamMemberUpdateSchema,employee_member_id:int,admin:TeamMembers=Depends(get_current_team_admin)):
    return update_team_member(session,admin.team_id,employee_member_id,member_data)

@teams_router.get('/{team_id}/my-statistics',response_model=TaskStatisticsResponseSchema,summary='Get your task statistics in a team')
def get_my_statistics(session:SessionDep,team_id:int,user: Users = Depends(get_current_user)):
    return get_my_task_statistics(session,team_id,user.id)

@teams_router.get('/{team_id}/statistics',response_model=TaskStatisticsResponseSchema,summary='Get statistics for all team tasks')
def get_team_statistics(session:SessionDep,admin:TeamMembers=Depends(get_current_team_admin)):
    return get_team_task_statistics(session,admin.team_id)

@teams_router.get('/{team_id}/members/{employee_member_id}/statistics',response_model=TaskStatisticsResponseSchema,summary='Get a team member’s task statistics')
def get_statistics_employee(session:SessionDep,employee_member_id:int,admin:TeamMembers=Depends(get_current_team_admin)):
    return get_member_task_statistics(session,admin.team_id,employee_member_id)

@teams_router.get('/{team_id}/goat/admin',response_model=GoatAdminResponseSchema,summary='Get the complete monthly GOAT ranking')
def goat(session:SessionDep,year: int = Query(ge=2000, le=2100),month: int = Query(ge=1, le=12),admin:TeamMembers=Depends(get_current_team_admin)):
    return get_admin_goat(session,admin.team_id,year, month)

@teams_router.get('/{team_id}/goat',response_model=GoatUserResponseSchema,summary='Get GOAT leaders and your own monthly result')
def goat_liders(session:SessionDep,team_id:int,year: int = Query(ge=2000, le=2100),month: int = Query(ge=1, le=12),user:Users=Depends(get_current_user)):
    return get_user_goat(session,team_id,user.id,year, month)


@teams_router.get('/{team_id}/history',response_model=TaskHistoryResponseSchema,summary='Get the team’s daily task history for a month')
def get_team_history(session:SessionDep,year: int = Query(ge=2000, le=2100),month: int = Query(ge=1, le=12),admin:TeamMembers=Depends(get_current_team_admin)):
    return get_team_task_history(session,admin.team_id,year,month)


@teams_router.get('/{team_id}/members/{employee_member_id}/history',response_model=TaskHistoryResponseSchema,summary='Get a team member’s daily task history for a month')
def get_member_history(session:SessionDep,employee_member_id:int,year: int = Query(ge=2000, le=2100),month: int = Query(ge=1, le=12),admin:TeamMembers=Depends(get_current_team_admin)):
    return get_member_task_history(session,admin.team_id,employee_member_id,year,month)
