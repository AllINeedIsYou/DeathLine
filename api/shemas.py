from pydantic import BaseModel, ConfigDict, EmailStr, Field
from datetime import datetime

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
    deadline: datetime | None = None




