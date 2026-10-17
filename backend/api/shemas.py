from pydantic import BaseModel, ConfigDict, EmailStr, Field
from datetime import datetime
from DataBase.models import priorities, TeamRole
from pydantic_extra_types.phone_numbers import PhoneNumber
from pydantic import field_validator
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
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

#=========================================================

class UserCreateSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name:str= Field(max_length=80, min_length=1)
    username: str= Field(max_length=40, min_length=3,pattern=r"^[a-zA-Z0-9_.-]+$", description="3-40 символов: латиница, цифры, _, ., -",examples=['johndoe'])
    email: EmailStr
    password: str=Field(max_length=128,min_length=8)
    phone:PhoneNumber|None=None
    telegram:str|None=Field(default=None, max_length=33,min_length=1,description='@username')
    timezone: str = Field(min_length=1, max_length=40)
    @field_validator('timezone')
    @classmethod
    def timezone_validator(cls, value:str):
        try:
            ZoneInfo(value)

        except (ZoneInfoNotFoundError, ValueError):
            raise ValueError("Укажи существующий часовой пояс")
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
#=========================================================

class TeamCreateSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True,str_strip_whitespace=True)
    name:str= Field(max_length=120, min_length=1)

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
    user:UserResponseSchema

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



