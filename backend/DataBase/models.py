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




