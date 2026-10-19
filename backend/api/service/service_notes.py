
from datetime import timezone,datetime

from sqlalchemy.exc import IntegrityError

from DataBase.database import SessionDep
from DataBase.models import TeamMembers,PrivateWorkerNotes
from fastapi import HTTPException
from ..shemas import PrivateWorkerNoteWriteSchema


def find_note_employee(session:SessionDep,team_id,employee_member_id,lock=False):
    query=session.query(TeamMembers).filter(TeamMembers.team_id==team_id,TeamMembers.id==employee_member_id)
    if lock:
        query=query.with_for_update()
    employee_teams_member=query.first()

    if employee_teams_member is None:
        raise HTTPException(status_code=404,detail="Участник не найден")
    else:
        return employee_teams_member
def get_private_worker_note(session:SessionDep,team_id,employee_member_id,author_member_id):
    find_note_employee(session,team_id,employee_member_id)

    query=session.query(PrivateWorkerNotes).filter(PrivateWorkerNotes.team_id==team_id,PrivateWorkerNotes.employee_member_id==employee_member_id,PrivateWorkerNotes.author_member_id==author_member_id).first()
    return query

def save_private_worker_note(session:SessionDep, team_id, employee_member_id, author_member_id, note_data:PrivateWorkerNoteWriteSchema):
    find_note_employee(session, team_id, employee_member_id,lock=True)

    note=get_private_worker_note(session, team_id, employee_member_id, author_member_id)

    now= datetime.now(timezone.utc)
    try:
        if note is None:
            note=PrivateWorkerNotes(
                team_id=team_id,
                author_member_id=author_member_id,
                employee_member_id=employee_member_id,
                text=note_data.text,
                updated_at=now
            )
        else:
            note.text=note_data.text
            note.updated_at=now

        session.add(note)
        session.commit()
        session.refresh(note)
    except IntegrityError:
        session.rollback()
        raise
    return note

def delete_private_worker_note(session:SessionDep, team_id, employee_member_id, author_member_id):
    find_note_employee(session, team_id, employee_member_id,lock=True)

    get_note=get_private_worker_note(session, team_id, employee_member_id, author_member_id)
    try:
        if get_note is None:
            return
        else:
            session.delete(get_note)
        session.commit()

    except IntegrityError:
        session.rollback()
        raise




