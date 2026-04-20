from datetime import datetime

from pydantic import BaseModel, field_validator


class CompanyCreate(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be empty")
        return v


class CompanyUpdate(BaseModel):
    name: str | None = None

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            if not v:
                raise ValueError("Name cannot be empty")
        return v


class CompanyOut(BaseModel):
    id: int
    name: str
    total_departments: int
    total_employees: int
    created_at: datetime
