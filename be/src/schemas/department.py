from datetime import datetime

from pydantic import BaseModel, field_validator


class DeptCreate(BaseModel):
    name: str
    company_id: int

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be empty")
        return v


class DeptUpdate(BaseModel):
    name: str | None = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Name cannot be empty")
        return v


class DeptOut(BaseModel):
    id: int
    name: str
    company_id: int
    active_employee_count: int
    created_at: datetime
