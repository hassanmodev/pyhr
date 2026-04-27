from datetime import date, datetime

from pydantic import BaseModel, field_validator

from src.core.validation import (
    validate_email,
    validate_hire_date,
    validate_mobile,
    validate_name,
    validate_password,
)
from src.models.employee import EmployeeStatus
from src.models.user import UserRole

class EmployeeCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    mobile: str
    address: str | None = None
    title: str
    hire_date: date
    status: EmployeeStatus = EmployeeStatus.ACTIVE
    department_id: int | None = None
    company_id: int
    password: str
    role: UserRole = UserRole.EMPLOYEE

    @field_validator("first_name")
    @classmethod
    def v_first_name(cls, v: str) -> str:
        return validate_name(v, "First name")

    @field_validator("last_name")
    @classmethod
    def v_last_name(cls, v: str) -> str:
        return validate_name(v, "Last name")

    @field_validator("email")
    @classmethod
    def v_email(cls, v: str) -> str:
        return validate_email(v)

    @field_validator("mobile")
    @classmethod
    def v_mobile(cls, v: str) -> str:
        return validate_mobile(v)

    @field_validator("title")
    @classmethod
    def v_title(cls, v: str) -> str:
        t = v.strip()
        if not t:
            raise ValueError("Title cannot be empty")
        return t

    @field_validator("hire_date")
    @classmethod
    def v_hire_date(cls, v: date) -> date:
        return validate_hire_date(v)

    @field_validator("password")
    @classmethod
    def v_password(cls, v: str) -> str:
        return validate_password(v)


class EmployeeUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    mobile: str | None = None
    address: str | None = None
    title: str | None = None
    hire_date: date | None = None
    status: EmployeeStatus | None = None
    department_id: int | None = None
    company_id: int | None = None
    role: UserRole | None = None

    @field_validator("first_name")
    @classmethod
    def v_first_name(cls, v: str | None) -> str | None:
        return validate_name(v, "First name") if v is not None else None

    @field_validator("last_name")
    @classmethod
    def v_last_name(cls, v: str | None) -> str | None:
        return validate_name(v, "Last name") if v is not None else None

    @field_validator("email")
    @classmethod
    def v_email(cls, v: str | None) -> str | None:
        return validate_email(v) if v is not None else None

    @field_validator("mobile")
    @classmethod
    def v_mobile(cls, v: str | None) -> str | None:
        return validate_mobile(v)

    @field_validator("title")
    @classmethod
    def v_title(cls, v: str | None) -> str | None:
        if v is None:
            return None
        t = v.strip()
        if not t:
            raise ValueError("Title cannot be empty")
        return t

    @field_validator("hire_date")
    @classmethod
    def v_hire_date(cls, v: date | None) -> date | None:
        return validate_hire_date(v) if v is not None else None


class EmployeeOut(BaseModel):
    id: int
    first_name: str
    last_name: str
    full_name: str
    email: str
    mobile: str
    address: str | None
    title: str
    hire_date: date
    status: EmployeeStatus
    department_id: int | None
    department_name: str | None = None
    company_id: int | None
    company_name: str
    days_employed: int
    created_at: datetime
    role: UserRole

    model_config = {"from_attributes": True}
