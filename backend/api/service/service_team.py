from datetime import datetime, timezone
from sqlalchemy.exc import IntegrityError
from DataBase.database import SessionDep
from api.shemas import TeamCreateSchema, TeamMemberResponseSchema, TaskCreateSchema, TaskUpdateSchema, \
    MyTeamResponseSchema,TeamMemberUpdateSchema
from DataBase.models import Teams, TeamMembers, TeamRole, Users, Tasks
from fastapi import HTTPException

def create_team(session:SessionDep,team_data:TeamCreateSchema,creator_id:int):
    now=datetime.now(timezone.utc)

    dump_team=team_data.model_dump()
    dump_team['created_at']=now
    new_team=Teams(**dump_team)
    session.add(new_team)
    try:
        session.flush()
        new_member=TeamMembers(team_id=new_team.id,user_id=creator_id,role=TeamRole.admin,joined_at=now)
        session.add(new_member)
        session.commit()
    except IntegrityError:
        session.rollback()
        raise

    session.refresh(new_team)
    return new_team
#мы получаем все команды в который состоит юзер(user_id)
def get_user_teams(session:SessionDep,user_id:int):
    query=session.query(Teams,TeamMembers).join(TeamMembers,Teams.id==TeamMembers.team_id).filter(TeamMembers.user_id == user_id).all()

    teamsresult=[]
    for team,member in query:
        myteam=MyTeamResponseSchema(
            id=team.id,
            name=team.name,
            role=member.role,
            created_at=team.created_at,
        )
        teamsresult.append(myteam)
    return teamsresult

#получаем таблицу TeamMembers по id команды и пользователя, id пользователя берем из ссесии
#проверям есть ли вообще доступ к команде, т.е состиоит ли пользователь в команде
def get_team_member(session:SessionDep,team_id:int,user_id:int):
    members=session.query(TeamMembers).filter(TeamMembers.team_id == team_id,TeamMembers.user_id == user_id).first()
    if members is None:
        raise HTTPException(status_code=403,detail="Нет доступа к команде")
    return members
#да, окей в команде состоит, а права админа есть для получения таблицы TeamMembers?
def require_team_admin(session:SessionDep,team_id:int,user_id:int):
    members=get_team_member(session,team_id,user_id)
    if members.role != TeamRole.admin:
        raise HTTPException(status_code=403,detail='Требуются права администратора')
    return members
#получаем всех юзеров которые находятся в команде
def get_team_members(session:SessionDep,team_id:int):
    members=session.query(TeamMembers,Users).join(Users, TeamMembers.user_id == Users.id).filter(TeamMembers.team_id == team_id).all()
    result=[]
    for member, user in members:
        TeamMember=TeamMemberResponseSchema(
            id=member.id,
            team_id=member.team_id,
            joined_at=member.joined_at,
            role=member.role,
            job_title=member.job_title,
            user=user
        )
        result.append(TeamMember)
    return result

#функция добавления задачи
def add_task(session: SessionDep, task_data:TaskCreateSchema,team_id:int):
    now = datetime.now(timezone.utc)
    team=session.query(TeamMembers).filter(TeamMembers.user_id == task_data.user_id, TeamMembers.team_id==team_id).first()

    user = session.query(Users).filter(Users.id == task_data.user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    if team is None:
        raise HTTPException(status_code=422, detail="Исполнитель не состоит в команде")

    #херачим в списк
    task_dict = task_data.model_dump()

    if task_dict['deadline'].tzinfo is None:
        raise HTTPException(status_code=422, detail="Incorrect timezone")
    if task_dict['deadline']<=now:
        raise HTTPException(status_code=422, detail="Incorrect time")

    #вручную присваиваем время сейчас
    task_dict["created_at"]=now
    task_dict['updated_at']=now
    new_task = Tasks(**task_dict,team_id=team_id)

    session.add(new_task)
    session.commit()
    session.refresh(new_task)
    return new_task
#Получаем ВСЕ задачи команды
def get_team_tasks(session:SessionDep,team_id:int):
    tasks=session.query(Tasks).filter(Tasks.team_id == team_id).all()
    return tasks

#Получаем конкретную задачу, в конкертной команде
def find_only_task(session: SessionDep, task_id:int, team_id:int):
    task = session.query(Tasks).filter(Tasks.id == task_id, Tasks.team_id==team_id).first()
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

#функция изменения задачи
def task_editing(session: SessionDep, task_id:int,team_id:int, task_data:TaskUpdateSchema):
    task = find_only_task(session,task_id,team_id)

    if task.completed_at is not None:
        raise HTTPException(status_code=400, detail="Task already completed")

    # получаем словарь из данных, отбрасывая непереданные (None) поля
    update_data = task_data.model_dump(exclude_unset=True)

    for field in ("title", "priority", "deadline"):
        if field in update_data and update_data[field] is None:
            raise HTTPException(status_code=422,detail=f"Поле {field} нельзя передать как null")
        if field=="deadline" and  field in update_data:
            if update_data[field].tzinfo is None:
                    raise HTTPException(status_code=422, detail="Incorrect timezone")

    task.updated_at = datetime.now(timezone.utc)

    # key столбец  value новое значение
    for key, value in update_data.items(): #.item как раз и берет парам столбец|новое значение
        #люся,поменяй столбец key на новое значение value в task
        setattr(task, key, value)


    session.commit()
    session.refresh(task)
    return task

#отметка о готовности
def complete_task(session: SessionDep, task_id:int,team_id:int,user_id:int):
    task = find_only_task(session,task_id,team_id)
    member=get_team_member(session,team_id,user_id)
    if task.user_id != member.user_id:
        raise HTTPException(status_code=403)
    if task.completed_at is not None:
        return task

    task.completed_at = datetime.now(timezone.utc)
    task.updated_at = datetime.now(timezone.utc)

    session.commit()
    session.refresh(task)
    return task


#функция для возвращения всех задач конкретного работника
def find_task_for_id(session: SessionDep, user_id:int, team_id:int):
    member=get_team_member(session,team_id,user_id)
    task=session.query(Tasks).filter(Tasks.team_id==member.team_id,Tasks.user_id == member.user_id).all()
    return task
#Возвращает конкретную задачу конкретного пользователя (для админа)
def get_task_for_user(session: SessionDep, user_id:int, team_id:int,task_id:int):
    task = find_only_task(session,task_id,team_id)
    member=get_team_member(session,team_id,user_id)
    if task.user_id != member.user_id and member.role!=TeamRole.admin:
        raise HTTPException(status_code=403)
    return task

def get_team_member_profile(session:SessionDep,team_id:int,employee_member_id:int):
    member=session.query(TeamMembers,Users).join(Users,TeamMembers.user_id==Users.id).filter(TeamMembers.team_id==team_id,TeamMembers.id==employee_member_id).first()
    if member is None:
        raise HTTPException(status_code=404)
    else:
        teammember,user=member
        response=TeamMemberResponseSchema(
            id=teammember.id,
            team_id=teammember.team_id,
            joined_at=teammember.joined_at,
            role=teammember.role,
            job_title=teammember.job_title,
            user=user
        )
    return response

def update_team_member(session:SessionDep,team_id:int,employee_member_id:int,member_data:TeamMemberUpdateSchema):
    member=session.query(TeamMembers).filter(TeamMembers.team_id==team_id,TeamMembers.id==employee_member_id).first()
    if member is None:
        raise HTTPException(status_code=404)
    member_dumb=member_data.model_dump(exclude_unset=True)
    try:
        if 'job_title' in member_dumb:
            member.job_title=member_dumb['job_title']
            session.commit()
            session.refresh(member)
    except IntegrityError:
        session.rollback()
        raise
    return get_team_member_profile(session,team_id, employee_member_id)