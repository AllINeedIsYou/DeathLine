from pydantic import BaseModel, ConfigDict, EmailStr, Field
from datetime import datetime
from DataBase.models import priorities

class WorkerCreateSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    role: str
    tg: str|None=None

class WorkerResponseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    role: str
    tg: str|None=None
    task: str|None = None
    #deadline_point: int | None = None

class TaskCreateSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    worker_id:int
    title: str = Field(max_length=120,min_length=1)
    description: str|None = Field(max_length=2000,default=None)
    priority: priorities
    deadline: datetime


class TaskResponseSchema(TaskCreateSchema):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    completed_at: datetime|None=Field(default=None)
    updated_at: datetime

class TaskUpdateSchema(BaseModel):
  title: str | None = Field(default=None, max_length=120, min_length=1)
  description: str | None = Field(default=None, max_length=2000)
  priority: priorities | None = None
  deadline: datetime | None = None






