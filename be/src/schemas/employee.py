import re
from datetime import date, datetime

from pydantic import BaseModel, EmailStr, field_validator

from src.models.employee import EmployeeStatus
from src.models.user import UserRole

_MOBILE_RE = re.compile(r"^\+?[\d\s()\-\.]{7,30}$")


def _check_mobile(v: str) -> str:
    v = v.strip()
    if not _MOBILE_RE.match(v):
        raise ValueError("Invalid mobile number format")
    if len(re.sub(r"\D", "", v)) < 7:
        raise ValueError("Mobile number must contain at least 7 digits")
    return v


class EmployeeCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    mobile: str
    address: str | None = None
    title: str
    hire_date: date
    status: EmployeeStatus = EmployeeStatus.ACTIVE
    department_id: int | None = None
    company_id: int
    password: str
    role: UserRole = UserRole.EMPLOYEE

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        return _check_mobile(v)


class EmployeeUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
    mobile: str | None = None
    address: str | None = None
    title: str | None = None
    hire_date: date | None = None
    status: EmployeeStatus | None = None
    department_id: int | None = None
    company_id: int | None = None
    role: UserRole | None = None

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v: str | None) -> str | None:
        return _check_mobile(v) if v is not None else None


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
    company_id: int | None
    company_name: str
    days_employed: int
    created_at: datetime
    role: UserRole

    model_config = {"from_attributes": True}
