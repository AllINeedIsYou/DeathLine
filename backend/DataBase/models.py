from enum import Enum
from datetime import datetime
from sqlalchemy import DateTime, String, ForeignKey,UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from DataBase.database import Base

class Users(Base):
    __tablename__ = 'Users'

    id:Mapped[int]=mapped_column(primary_key=True)

    name:Mapped[str]=mapped_column(String(80),nullable=False)

    username:Mapped[str]=mapped_column(String(40),nullable=False,unique=True)

    email:Mapped[str]=mapped_column(String(254),nullable=False,unique=True)

    password_hash:Mapped[str]=mapped_column(String(255),nullable=False)

    email_verified_at:Mapped[datetime|None]=mapped_column(DateTime(timezone=True),nullable=True,default=None)

    phone:Mapped[str|None]=mapped_column(nullable=True)

    telegram:Mapped[str|None]=mapped_column(String(33),nullable=True)

    timezone:Mapped[str]=mapped_column(String(40),nullable=False)

    created_at:Mapped[datetime] = mapped_column(DateTime(timezone=True),nullable=False)

class UserSessions(Base):
    __tablename__ = 'UserSessions'

    id: Mapped[int] = mapped_column(primary_key=True)

    user_id: Mapped[int] = mapped_column(ForeignKey(Users.id), nullable=False)

    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

class Teams(Base):
    __tablename__ = 'Teams'

    id:Mapped[int]=mapped_column(primary_key=True)

    name:Mapped[str]=mapped_column(String(120),nullable=False)

    timezone:Mapped[str]=mapped_column(String(40), default='Europe/Moscow', nullable=False)

    created_at:Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

class TeamRole(Enum):
    admin='admin'
    employee='employee'

class TeamMembers(Base):
    __tablename__ = 'TeamMembers'
    __table_args__ = (UniqueConstraint("team_id", "user_id", name="uq_team_member"),)

    id:Mapped[int]=mapped_column(primary_key=True)

    team_id:Mapped[int]=mapped_column(ForeignKey(Teams.id),nullable=False)

    user_id:Mapped[int]=mapped_column(ForeignKey(Users.id),nullable=False)

    role:Mapped[TeamRole]=mapped_column(nullable=False)

    job_title:Mapped[str|None]=mapped_column(String(120),default=None)

    joined_at:Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

class priorities(Enum):
    high='high'
    medium='medium'
    low='low'

class Tasks(Base):
    __tablename__ = 'Tasks'

    id:Mapped[int]=mapped_column(primary_key=True)

    user_id:Mapped[int]=mapped_column(ForeignKey(Users.id),nullable=False)

    title:Mapped[str]=mapped_column(String(120),nullable=False)

    description:Mapped[str]=mapped_column(String(2000),nullable=True)

    priority:Mapped[priorities]=mapped_column(nullable=False)

    deadline: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    team_id:Mapped[int]=mapped_column(ForeignKey(Teams.id),nullable=False)

    created_at:Mapped[datetime] = mapped_column(DateTime(timezone=True),nullable=False)

    completed_at:Mapped[datetime|None] = mapped_column(DateTime(timezone=True), nullable=True, default=None)

    updated_at:Mapped[datetime] = mapped_column(DateTime(timezone=True),nullable=False)

class TeamInvitations(Base):
    __tablename__ = 'TeamInvitations'

    id:Mapped[int]=mapped_column(primary_key=True)

    team_id:Mapped[int]=mapped_column(ForeignKey(Teams.id),nullable=False)

    created_by:Mapped[int]=mapped_column(ForeignKey(Users.id),nullable=False)

    email:Mapped[str]=mapped_column(String(254),nullable=False)

    role:Mapped[TeamRole]=mapped_column(nullable=False)

    token_hash:Mapped[str]=mapped_column(String(64),nullable=False,unique=True)

    created_at:Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    expires_at:Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    accepted_at:Mapped[datetime|None] = mapped_column(DateTime(timezone=True), nullable=True, default=None)

    revoked_at:Mapped[datetime|None] = mapped_column(DateTime(timezone=True), nullable=True, default=None)

class EmailVerificationTokens(Base):
    __tablename__ = 'EmailVerificationTokens'

    id:Mapped[int]=mapped_column(primary_key=True)

    user_id:Mapped[int]=mapped_column(ForeignKey(Users.id), nullable=False)

    email:Mapped[str]=mapped_column(String(254),nullable=False)

    token_hash:Mapped[str]=mapped_column(String(64), unique=True, nullable=False)

    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, default=None)

    created_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),nullable=False)

    expires_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),nullable=False)

    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, default=None)

class PasswordResetTokens(Base):
    __tablename__ = 'PasswordResetTokens'

    id: Mapped[int] = mapped_column(primary_key=True)

    user_id: Mapped[int] = mapped_column(ForeignKey(Users.id), nullable=False)

    email: Mapped[str] = mapped_column(String(254), nullable=False)

    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)

    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, default=None)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, default=None)

class PrivateWorkerNotes(Base):
    __tablename__ = "PrivateWorkerNotes"
    __table_args__ = (UniqueConstraint("author_member_id", "employee_member_id", name="uq_private_worker_note"),)

    id:Mapped[int]=mapped_column(primary_key=True)

    team_id:Mapped[int]=mapped_column(ForeignKey(Teams.id),nullable=False)

    author_member_id:Mapped[int]=mapped_column(ForeignKey(TeamMembers.id),nullable=False)

    employee_member_id: Mapped[int] = mapped_column(ForeignKey(TeamMembers.id),nullable=False)

    text:Mapped[str]=mapped_column(String(4000),nullable=False)

    updated_at:Mapped[datetime]=mapped_column(DateTime(timezone=True),nullable=False)

class TaskEventType(Enum):
    created='created'
    updated='updated'
    completed='completed'


class TaskEvents(Base):
    __tablename__ = 'TaskEvents'

    id:Mapped[int]=mapped_column(primary_key=True)

    task_id:Mapped[int]=mapped_column(ForeignKey(Tasks.id))

    team_id:Mapped[int]=mapped_column(ForeignKey(Teams.id))

    user_id:Mapped[int]=mapped_column(ForeignKey(Users.id))

    event_type:Mapped[TaskEventType]

    occurred_at:Mapped[datetime]=mapped_column(DateTime(timezone=True))

    deadline:Mapped[datetime]=mapped_column(DateTime(timezone=True))

    completed_at:Mapped[datetime|None]=mapped_column(DateTime(timezone=True))
