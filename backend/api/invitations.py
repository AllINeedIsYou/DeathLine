from fastapi import APIRouter, Depends

from DataBase.database import SessionDep
from DataBase.models import Users
from .dependencies import get_current_user
from .shemas import TeamInvitationPreviewSchema
from .service.service_invitations import get_invitation_preview,accept_team_invitation

invitations_router=APIRouter(prefix='/invitations', tags=['Invitations'])

@invitations_router.get('/{token}',response_model=TeamInvitationPreviewSchema, summary='Preview a team invitation by token')
def invitations(session:SessionDep,token:str):
    return get_invitation_preview(session=session,token=token)

@invitations_router.post('/{token}/accept',status_code=204, summary='Accept an invitation and join the team')
def accept_team(session:SessionDep,token:str,user:Users=Depends(get_current_user)):
    accept_team_invitation(session, token, user)