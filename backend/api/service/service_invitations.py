import hashlib
import secrets
from datetime import datetime, timezone, timedelta


from sqlalchemy.exc import IntegrityError
from DataBase.database import SessionDep
from api.shemas import TeamInvitationCreateSchema, TeamInvitationListItemSchema, TeamInvitationPreviewSchema
from DataBase.models import Teams, TeamMembers, Users, TeamInvitations
from fastapi import HTTPException
#создания токена и приглашения полтзователя по email
def create_team_invitation(session: SessionDep, team_data:TeamInvitationCreateSchema,team_id:int,creator_id:int):
    now=datetime.now(timezone.utc)
    team_email=session.query(TeamMembers).join(Users, TeamMembers.user_id == Users.id).filter(Users.email == team_data.email,TeamMembers.team_id==team_id).first()
    TI=session.query(TeamInvitations).filter(TeamInvitations.email == team_data.email,TeamInvitations.team_id==team_id, TeamInvitations.expires_at>now, TeamInvitations.accepted_at.is_(None),TeamInvitations.revoked_at.is_(None)).first()

    if TI is not None:
        raise HTTPException(status_code=409, detail="Действующее приглашение уже существует")
    if team_email is not None:
        raise HTTPException(status_code=409, detail="Пользователь уже состоит в команде")

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
#проверяем статус
def get_invitation_status(invitation: TeamInvitations):
    if invitation.accepted_at is not None:
        return 'accepted'
    if invitation.revoked_at is not None:
        return 'revoked'
    if invitation.expires_at<=datetime.now(timezone.utc):
        return 'expired'
    else:
        return 'pending'
# получаем все заявки команды ||||||| order_by(TeamInvitations.created_at.desc()) фильтрует по дате создание от большего к меньшему
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
# поиск приглашения в определеной команде по id приглоса
def find_team_invitation(session: SessionDep, team_id:int, invitation_id:int,lock:bool=False):
    query=session.query(TeamInvitations).filter(TeamInvitations.team_id==team_id,TeamInvitations.id==invitation_id)

    if lock:
        query=query.with_for_update()

    invite_team=query.first()

    if invite_team is None:
        raise HTTPException(status_code=404,detail='Приглашение не найдено')

    return invite_team
#отменяет заявку
def revoke_team_invitation(session: SessionDep, team_id:int, invitation_id:int):
    invite_team=find_team_invitation(session,team_id,invitation_id,lock=True)
    status=get_invitation_status(invite_team)
    if status=='expired' or status=='accepted':
        raise HTTPException(status_code=409,detail='Приглашение уже принято или срок истёк')
    if status=='pending':
        invite_team.revoked_at=datetime.now(timezone.utc)
        session.commit()
        session.refresh(invite_team)
        return invite_team
    if status=='revoked':
        return invite_team
#поиск заявки по токену
def find_invitation_by_token(session: SessionDep, token:str, lock:bool=False):
    token_hash=hashlib.sha256(token.encode()).hexdigest()

    query=session.query(TeamInvitations).filter(TeamInvitations.token_hash==token_hash)
    if lock:
        query=query.with_for_update()#блокировка строка приглашения до комита

    finde_token=query.first()
    if finde_token is None:
        raise HTTPException(status_code=404,detail='Приглашение не найдено')
    return finde_token
#получаем имя команды, куда вствупает пользовтель по токену + формируем форму ответа(preview)
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
#проверяем сопадает ли email юзера и email указанный в приглосе
def check_invitation_for_user(invitation,user):
    if get_invitation_status(invitation) != 'pending':
        raise HTTPException(status_code=409)
    if invitation.email != user.email:
        raise HTTPException(status_code=403)
    if user.email_verified_at is None:
        raise HTTPException(status_code=403, detail="Подтвердите почту")
    return invitation
#потверждение пришглоса и добавления пользователя в комнаду бд(TeamMembers)
def accept_team_invitation(session:SessionDep,token:str,user):
    find_token=find_invitation_by_token(session, token,lock=True)

    check_invitation_for_user(find_token,user)

    member=session.query(TeamMembers).filter(TeamMembers.user_id==user.id,TeamMembers.team_id==find_token.team_id).first()
    if member is not None:
        raise HTTPException(status_code=409,detail='Пользователь уже состоит в команде')

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

