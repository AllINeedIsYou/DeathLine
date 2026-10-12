from pydantic import BaseModel, ConfigDict, EmailStr, Field
from datetime import datetime
from DataBase.models import priorities
from pydantic_extra_types.phone_numbers import PhoneNumber

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

class UserCreateSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name:str= Field(max_length=80, min_length=1)
    username: str= Field(max_length=40, min_length=3,pattern=r"^[a-zA-Z0-9_.-]+$", description="3-40 символов: латиница, цифры, _, ., -",examples=['johndoe'])
    email: EmailStr
    password: str=Field(max_length=128,min_length=8)
    phone:PhoneNumber|None=None
    telegram:str|None=Field(default=None, max_length=33,min_length=1,description='@username')
    timezone:str

class UserResponseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:int
    name: str
    username: str
    email: EmailStr
    phone: PhoneNumber | None
    telegram: str | None
    timezone: str
    created_at: datetime
    email_verified_at:datetime|None=None








