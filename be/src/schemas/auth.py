from pydantic import BaseModel, EmailStr

from src.models.user import UserRole


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    email: str
    role: UserRole
    company_id: int | None
    is_active: bool

    model_config = {"from_attributes": True}
