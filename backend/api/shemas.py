from pydantic import BaseModel, ConfigDict, EmailStr, Field
from datetime import datetime
from DataBase.models import priorities, TeamRole
from pydantic_extra_types.phone_numbers import PhoneNumber
from pydantic import field_validator
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from api.validators import validate_password
#=========================================================

class TaskCreateSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id:int
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
    team_id:int

class TaskUpdateSchema(BaseModel):
  title: str | None = Field(default=None, max_length=120, min_length=1)
  description: str | None = Field(default=None, max_length=2000)
  priority: priorities | None = None
  deadline: datetime | None = None
  user_id:int|None= Field(default=None, gt=0)

#=========================================================

class UserCreateSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name:str= Field(max_length=80, min_length=1)
    username: str= Field(max_length=40, min_length=3,pattern=r"^[a-zA-Z0-9_.-]+$", description="3–40 characters: Latin letters, digits, _, ., -",examples=['johndoe'])
    email: EmailStr
    password: str=Field(max_length=128,min_length=8)
    phone:PhoneNumber|None=None
    telegram:str|None=Field(default=None, max_length=33,min_length=1,description='@username')
    timezone: str = Field(min_length=1, max_length=40)

    @field_validator('password')
    @classmethod
    def password_validator(cls, value):
        return validate_password(value)

    @field_validator('timezone')
    @classmethod
    def timezone_validator(cls, value:str):
        try:
            ZoneInfo(value)

        except (ZoneInfoNotFoundError, ValueError):
            raise ValueError("Enter a valid time zone")
        return value

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

class UserLoginSchema(BaseModel):
    username: str = Field(min_length=1, max_length=40)
    password: str = Field(min_length=1, max_length=128)

class UserUpdateSchema(BaseModel):
    name:str|None=Field(min_length=1, max_length=80,default=None)
    phone:PhoneNumber|None=None
    telegram:str|None=Field(min_length=1, max_length=33,default=None)
    timezone:str|None=Field(min_length=1, max_length=40,default=None)

    @field_validator('timezone')
    @classmethod
    def timezone_validator(cls, value: str|None):
        if value is None:
            return value
        try:
            ZoneInfo(value)

        except (ZoneInfoNotFoundError, ValueError):
            raise ValueError("Enter a valid time zone")
        return value
#=========================================================

class TeamCreateSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True,str_strip_whitespace=True)

    name:str= Field(max_length=120, min_length=1)
    timezone:str=Field(max_length=40,min_length=1,default='Europe/Moscow')
    @field_validator('timezone')
    @classmethod
    def timezone_validator(cls, value: str):
        try:
            ZoneInfo(value)

        except (ZoneInfoNotFoundError, ValueError):
            raise ValueError("Enter a valid time zone")
        return value


class TeamResponseSchema(TeamCreateSchema):
    model_config = ConfigDict(from_attributes=True)
    id:int
    created_at: datetime
    #name

class TeamMemberResponseSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:int
    team_id:int
    joined_at: datetime
    role: TeamRole
    job_title: str | None
    user:UserResponseSchema

class TeamMemberUpdateSchema(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    job_title:str|None=Field(min_length=1,max_length=120,default=None)

class MyTeamResponseSchema(TeamResponseSchema):
    model_config = ConfigDict(from_attributes=True)

    role:TeamRole
    #id
    #name
    #created_at

class TeamInvitationCreateSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    email:EmailStr
    role:TeamRole= Field(default=TeamRole.employee)

class TeamInvitationResponseSchema(TeamInvitationCreateSchema):
    model_config = ConfigDict(from_attributes=True)
    id:int
    team_id:int
    created_by: int
    created_at: datetime
    expires_at: datetime
    accepted_at:datetime|None=None
    revoked_at:datetime|None=None

class TeamInvitationLinkResponseSchema(BaseModel):
    invitation:TeamInvitationResponseSchema
    invite_url:str

class TeamInvitationListItemSchema(TeamInvitationResponseSchema):
    status:str

class TeamInvitationPreviewSchema(BaseModel):
    team_id:int
    team_name:str
    email:EmailStr
    role:TeamRole
    expires_at: datetime
    status:str

class EmailVerificationConfirmSchema(BaseModel):
    token:str=Field(min_length=1)

class UserRegistrationResponseSchema(UserResponseSchema):
    verification_email_sent: bool

class PasswordResetRequestSchema(BaseModel):
    email:EmailStr

class PasswordResetConfirmSchema(BaseModel):
    token:str=Field(min_length=1)
    new_password:str=Field(min_length=8,max_length=128)

    @field_validator('new_password')
    @classmethod
    def password_validator(cls, value):
        return validate_password(value)

#=========================================================
class PrivateWorkerNoteWriteSchema(BaseModel):
    model_config=ConfigDict(str_strip_whitespace=True)

    text:str=Field(max_length=4000,min_length=1)

class PrivateWorkerNoteResponseSchema(PrivateWorkerNoteWriteSchema):
    model_config=ConfigDict(from_attributes=True)

    id:int
    team_id:int
    author_member_id:int
    employee_member_id:int
    updated_at:datetime

#=========================================================

class TaskStatisticsResponseSchema(BaseModel):
    total:int
    active:int
    completed:int
    overdue:int
    on_time_percent: float | None
    productivity_percent: float | None

class GoatMemberResponseSchema(BaseModel):
    member_id:int
    user_id:int
    name:str
    job_title:str|None
    statistics:TaskStatisticsResponseSchema
    score:float|None
    rank:int|None

class GoatAdminResponseSchema(BaseModel):
    team_id: int
    year: int
    month: int
    timezone: str
    members: list[GoatMemberResponseSchema]

class GoatUserResponseSchema(BaseModel):
    team_id: int
    year: int
    month: int
    timezone: str
    leaders: list[GoatMemberResponseSchema]
    my_result: GoatMemberResponseSchema


class TaskHistoryPointSchema(BaseModel):
    at: datetime
    created: int | None = Field(description='Number of tasks that existed at this point. For a member, tasks assigned to them at that point; null if the assignee is unknown.')
    completed: int | None = Field(description='Number of tasks completed by this point; null if assignee history is incomplete.')
    overdue: int | None = Field(description='Number of unfinished overdue tasks at this point; null if history is incomplete.')


class TaskHistoryResponseSchema(BaseModel):
    team_id: int
    member_id: int | None = None
    year: int
    month: int
    timezone: str
    as_of: datetime
    history_complete: bool
    points: list[TaskHistoryPointSchema]
