from enum import Enum
from datetime import datetime
from sqlalchemy import DateTime, String, ForeignKey,func
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column
from DataBase.database import Base

class Workers(Base):
    __tablename__ = 'Workers'

    id:Mapped[int]=mapped_column(primary_key=True)

    name:Mapped[str]=mapped_column(String(200))

    role:Mapped[str|None]=mapped_column(String(200),nullable=True)

    tg:Mapped[str|None]=mapped_column(String(200), default=None,nullable=True)

    task:Mapped[str|None]=mapped_column(String(1000),nullable=True)

    #deadline_point:Mapped[int|None]=mapped_column(default=None,nullable=True)

class priorities(Enum):
    high='high'
    medium='medium'
    low='low'

class Tasks(Base):
    __tablename__ = 'Tasks'

    id:Mapped[int]=mapped_column(primary_key=True)

    worker_id:Mapped[int]=mapped_column(ForeignKey(Workers.id),nullable=False)

    title:Mapped[str]=mapped_column(String(120),nullable=False)

    description:Mapped[str]=mapped_column(String(2000),nullable=True)

    priority:Mapped[priorities]=mapped_column(nullable=False)

    deadline: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    created_at:Mapped[datetime] = mapped_column(DateTime(timezone=True),nullable=False)

    completed_at:Mapped[datetime|None] = mapped_column(DateTime(timezone=True), nullable=True, default=None)

    updated_at:Mapped[datetime] = mapped_column(DateTime(timezone=True),nullable=False)