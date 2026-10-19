import hashlib
import secrets
import logging
from smtplib import SMTPException
from datetime import datetime, timezone, timedelta


from sqlalchemy.exc import IntegrityError
from DataBase.database import SessionDep
from api.shemas import TeamInvitationCreateSchema, TeamInvitationListItemSchema, TeamInvitationPreviewSchema
from DataBase.models import Teams, TeamMembers, Users, TeamInvitations
from fastapi import HTTPException
from .service_mail import build_email_message, send_email

logger = logging.getLogger(__name__)


def send_team_invitation_email(session: SessionDep, invitation: TeamInvitations, invite_url: str):
    team = session.query(Teams).filter(Teams.id == invitation.team_id).first()
    team_name = ' '.join(team.name.splitlines())
    role = 'Administrator' if invitation.role.value == 'admin' else 'Employee'
    text = (
        f'You have been invited to join {team_name} on DeathLine.\n\n'
        f'Your team role: {role}\n'
        f'Accept your invitation:\n{invite_url}\n\n'
        'Sign in or create an account with this email address, verify it, '
        'and accept the invitation.\n'
        f'This link expires on {invitation.expires_at:%Y-%m-%d %H:%M %Z}.\n\n'
        'If you were not expecting this invitation, you can ignore this email.'
    )
    try:
        message = build_email_message(invitation.email, f'Invitation to {team_name} — DeathLine', text)
        send_email(message)
    except (SMTPException, OSError) as error:
        logger.warning('Invitation email delivery failed (%s)', type(error).__name__)
        return False
    return True


def resend_team_invitation(session: SessionDep, team_id: int, invitation_id: int, creator_id: int):
    invitation = find_team_invitation(session, team_id, invitation_id, lock=True)
    if get_invitation_status(invitation) != 'pending':
        raise HTTPException(status_code=409, detail='Only pending invitations can be resent')
    now = datetime.now(timezone.utc)
    if invitation.created_at + timedelta(seconds=60) > now:
        raise HTTPException(status_code=429, detail='Please wait a minute before resending the invitation')
    member = session.query(TeamMembers).join(Users, TeamMembers.user_id == Users.id).filter(
        TeamMembers.team_id == team_id, Users.email == invitation.email
    ).first()
    if member is not None:
        raise HTTPException(status_code=409, detail='The user is already a member of this team')
    token = secrets.token_urlsafe(32)
    replacement = TeamInvitations(
        team_id=team_id, created_by=creator_id, email=invitation.email, role=invitation.role,
        token_hash=hashlib.sha256(token.encode()).hexdigest(),
        created_at=now, expires_at=now + timedelta(days=7)
    )
    try:
        invitation.revoked_at = now
        session.add(replacement)
        session.commit()
    except IntegrityError:
        session.rollback()
        raise
    session.refresh(replacement)
    return replacement, token

# Create an invitation and a token for the recipient email.
def create_team_invitation(session: SessionDep, team_data:TeamInvitationCreateSchema,team_id:int,creator_id:int):
    now=datetime.now(timezone.utc)
    team_email=session.query(TeamMembers).join(Users, TeamMembers.user_id == Users.id).filter(Users.email == team_data.email,TeamMembers.team_id==team_id).first()
    TI=session.query(TeamInvitations).filter(TeamInvitations.email == team_data.email,TeamInvitations.team_id==team_id, TeamInvitations.expires_at>now, TeamInvitations.accepted_at.is_(None),TeamInvitations.revoked_at.is_(None)).first()

    if TI is not None:
        raise HTTPException(status_code=409, detail="An active invitation already exists")
    if team_email is not None:
        raise HTTPException(status_code=409, detail="The user is already a member of this team")

    token=secrets.token_urlsafe(32)
    token_hash=hashlib.sha256(token.encode()).hexdigest()

    Invite=TeamInvitations(
        team_id=team_id,
        created_by=creator_id,
        email=team_data.email,
        role=team_data.role,
        token_hash=token_hash,
        created_at=now,
        expires_at=now+timedelta(days=7)
    )
    try:
        session.add(Invite)
        session.commit()

    except IntegrityError:
        session.rollback()
        raise

    session.refresh(Invite)
    return Invite,token
# Determine the invitation status.
def get_invitation_status(invitation: TeamInvitations):
    if invitation.accepted_at is not None:
        return 'accepted'
    if invitation.revoked_at is not None:
        return 'revoked'
    if invitation.expires_at<=datetime.now(timezone.utc):
        return 'expired'
    else:
        return 'pending'
# List team invitations ordered from newest to oldest.
def get_team_invitations(session: SessionDep, team_id:int):
    invitions=session.query(TeamInvitations).filter(TeamInvitations.team_id==team_id).order_by(TeamInvitations.created_at.desc()).all()
    all_invitions=[]
    for invite in invitions:
        inv=TeamInvitationListItemSchema(
            id=invite.id,
            email=invite.email,
            role=invite.role,
            team_id=invite.team_id,
            created_by=invite.created_by,
            created_at=invite.created_at,
            expires_at=invite.expires_at,
            accepted_at=invite.accepted_at,
            revoked_at=invite.revoked_at,
            status=get_invitation_status(invite)
        )
        all_invitions.append(inv)
    return all_invitions
# Look up an invitation by its ID within the team.
def find_team_invitation(session: SessionDep, team_id:int, invitation_id:int,lock:bool=False):
    query=session.query(TeamInvitations).filter(TeamInvitations.team_id==team_id,TeamInvitations.id==invitation_id)

    if lock:
        query=query.with_for_update()

    invite_team=query.first()

    if invite_team is None:
        raise HTTPException(status_code=404,detail='Invitation not found')

    return invite_team
# Revoke an invitation.
def revoke_team_invitation(session: SessionDep, team_id:int, invitation_id:int):
    invite_team=find_team_invitation(session,team_id,invitation_id,lock=True)
    status=get_invitation_status(invite_team)
    if status=='expired' or status=='accepted':
        raise HTTPException(status_code=409,detail='The invitation has already been accepted or has expired')
    if status=='pending':
        invite_team.revoked_at=datetime.now(timezone.utc)
        session.commit()
        session.refresh(invite_team)
        return invite_team
    if status=='revoked':
        return invite_team
# Look up an invitation by token.
def find_invitation_by_token(session: SessionDep, token:str, lock:bool=False):
    token_hash=hashlib.sha256(token.encode()).hexdigest()

    query=session.query(TeamInvitations).filter(TeamInvitations.token_hash==token_hash)
    if lock:
        query=query.with_for_update()# Lock the invitation row until commit or rollback.

    finde_token=query.first()
    if finde_token is None:
        raise HTTPException(status_code=404,detail='Invitation not found')
    return finde_token
# Build the public invitation preview, including the team name.
def get_invitation_preview(session:SessionDep,token:str):
    find_token=find_invitation_by_token(session, token)
    team_name=session.query(Teams).filter(Teams.id==find_token.team_id).first()
    if team_name is None:
        raise HTTPException(status_code=404)

    preview=TeamInvitationPreviewSchema(
        team_id=find_token.team_id,
        team_name=team_name.name,
        email=find_token.email,
        role=find_token.role,
        expires_at=find_token.expires_at,
        status=get_invitation_status(find_token)
    )
    return preview
# Require the user's email to match the invitation recipient.
def check_invitation_for_user(invitation,user):
    if get_invitation_status(invitation) != 'pending':
        raise HTTPException(status_code=409)
    if invitation.email != user.email:
        raise HTTPException(status_code=403)
    if user.email_verified_at is None:
        raise HTTPException(status_code=403, detail="Please verify your email")
    return invitation
# Accept the invitation and add the user to TeamMembers.
def accept_team_invitation(session:SessionDep,token:str,user):
    find_token=find_invitation_by_token(session, token,lock=True)

    check_invitation_for_user(find_token,user)

    member=session.query(TeamMembers).filter(TeamMembers.user_id==user.id,TeamMembers.team_id==find_token.team_id).first()
    if member is not None:
        raise HTTPException(status_code=409,detail='The user is already a member of this team')

    now = datetime.now(timezone.utc)
    find_token.accepted_at = now

    try:
        TM = TeamMembers(
            team_id=find_token.team_id,
            user_id=user.id,
            role=find_token.role,
            joined_at=now
        )
        session.add(TM)
        session.commit()
    except IntegrityError:
        session.rollback()
        raise
    session.refresh(TM)
    return TM

