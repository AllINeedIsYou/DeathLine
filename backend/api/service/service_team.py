from datetime import datetime, timezone
from sqlalchemy.exc import IntegrityError
from DataBase.database import SessionDep
from api.shemas import TeamCreateSchema, TeamMemberResponseSchema, TaskCreateSchema, TaskUpdateSchema, \
    MyTeamResponseSchema,TeamMemberUpdateSchema
from DataBase.models import Teams, TeamMembers, TeamRole, Users, Tasks,TaskEventType
from fastapi import HTTPException
from .service_task_history import record_task_event

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
# Get all teams that the user belongs to.
def get_user_teams(session:SessionDep,user_id:int):
    query=session.query(Teams,TeamMembers).join(TeamMembers,Teams.id==TeamMembers.team_id).filter(TeamMembers.user_id == user_id).all()

    teamsresult=[]
    for team,member in query:
        myteam=MyTeamResponseSchema(
            id=team.id,
            name=team.name,
            role=member.role,
            created_at=team.created_at,
            timezone=team.timezone,
        )
        teamsresult.append(myteam)
    return teamsresult

# Look up membership by team ID and the user ID from the session.
# Require membership before granting access to a team.
def get_team_member(session:SessionDep,team_id:int,user_id:int):
    members=session.query(TeamMembers).filter(TeamMembers.team_id == team_id,TeamMembers.user_id == user_id).first()
    if members is None:
        raise HTTPException(status_code=403,detail="You do not have access to this team")
    return members
# Require the administrator role for team management.
def require_team_admin(session:SessionDep,team_id:int,user_id:int):
    members=get_team_member(session,team_id,user_id)
    if members.role != TeamRole.admin:
        raise HTTPException(status_code=403,detail='Administrator access is required')
    return members
# Get all users who belong to the team.
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

# Create a task.
def add_task(session: SessionDep, task_data:TaskCreateSchema,team_id:int):
    now = datetime.now(timezone.utc)
    team=session.query(TeamMembers).filter(TeamMembers.user_id == task_data.user_id, TeamMembers.team_id==team_id).first()

    user = session.query(Users).filter(Users.id == task_data.user_id).first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    if team is None:
        raise HTTPException(status_code=422, detail="The assignee is not a member of this team")

    # Prepare the task fields.
    task_dict = task_data.model_dump()

    if task_dict['deadline'].tzinfo is None:
        raise HTTPException(status_code=422, detail="Incorrect timezone")
    if task_dict['deadline']<=now:
        raise HTTPException(status_code=422, detail="Incorrect time")

    # Set the current timestamp explicitly.
    task_dict["created_at"]=now
    task_dict['updated_at']=now
    new_task = Tasks(**task_dict,team_id=team_id)

    try:
        session.add(new_task)
        record_task_event(session,new_task,TaskEventType.created)
        session.commit()
    except IntegrityError:
        session.rollback()
        raise

    session.refresh(new_task)
    return new_task
# Get all tasks belonging to the team.
def get_team_tasks(session:SessionDep,team_id:int):
    tasks=session.query(Tasks).filter(Tasks.team_id == team_id).all()
    return tasks

# Look up a task within the specified team.
def find_only_task(session: SessionDep, task_id:int, team_id:int):
    task = session.query(Tasks).filter(Tasks.id == task_id, Tasks.team_id==team_id).first()
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

# Update a task.
def task_editing(session: SessionDep, task_id:int,team_id:int, task_data:TaskUpdateSchema):
    task = find_only_task(session,task_id,team_id)

    if task.completed_at is not None:
        raise HTTPException(status_code=400, detail="Task already completed")

    # Dump only explicitly submitted fields; omitted fields are left unchanged.
    update_data = task_data.model_dump(exclude_unset=True)
    if not update_data:
        return task
    now=datetime.now(timezone.utc)
    for field in ("title", "priority", "deadline",'user_id'):
        if field in update_data and update_data[field] is None:
            raise HTTPException(status_code=422,detail=f"Field {field} cannot be null")
        if field=="deadline" and  field in update_data:
            if update_data[field].tzinfo is None:
                    raise HTTPException(status_code=422, detail="Incorrect timezone")
            if update_data[field]<=now:
                raise HTTPException(status_code=422,detail='Enter a deadline in the future')
        if field=='user_id' and field in update_data:
            user=session.query(TeamMembers).filter(TeamMembers.team_id==team_id,TeamMembers.user_id==update_data['user_id']).first()
            if user is None:
                raise HTTPException(status_code=422,detail='The assignee is not a member of this team')

    task.updated_at = now

    # The key is a column name; value is its new value.
    for key, value in update_data.items(): # items() yields column-name and new-value pairs.
        # Set the named task attribute to the submitted value.
        setattr(task, key, value)

    try:
        record_task_event(session, task, TaskEventType.updated)
        session.commit()
    except IntegrityError:
        session.rollback()
        raise

    session.refresh(task)
    return task

# Mark a task as completed.
def complete_task(session: SessionDep, task_id:int,team_id:int,user_id:int):
    task = find_only_task(session,task_id,team_id)
    member=get_team_member(session,team_id,user_id)
    if task.user_id != member.user_id:
        raise HTTPException(status_code=403)
    if task.completed_at is not None:
        return task

    now=datetime.now(timezone.utc)
    task.completed_at = now
    task.updated_at = now

    try:
        record_task_event(session, task, TaskEventType.completed)
        session.commit()
    except IntegrityError:
        session.rollback()
        raise

    session.refresh(task)
    return task


# Get all tasks assigned to one team member.
def find_task_for_id(session: SessionDep, user_id:int, team_id:int):
    member=get_team_member(session,team_id,user_id)
    tasks=session.query(Tasks).filter(Tasks.team_id==member.team_id,Tasks.user_id == member.user_id).all()
    return tasks
# Get a task available to the assignee or an administrator.
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