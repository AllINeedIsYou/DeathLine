from sqlalchemy import String
from datetime import datetime
from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column
from DataBase.database import Base

class Workers(Base):
    __tablename__ = 'Workers'

    id:Mapped[int]=mapped_column(primary_key=True)

    name:Mapped[str]=mapped_column(String(200))

    role:Mapped[str|None]=mapped_column(String(200))

    tg:Mapped[str|None]=mapped_column(String(200), default=None)

    task:Mapped[str|None]=mapped_column(String(1000))

    deadline:Mapped[datetime|None]=mapped_column(DateTime(timezone=True), default=None)

    deadline_point:Mapped[int|None]=mapped_column(default=None)