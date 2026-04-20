from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from src.core.deps import get_current_user
from src.core.security import create_access_token, verify_password
from src.database import get_db
from src.models.employee import Employee
from src.schemas.auth import LoginRequest, TokenResponse, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    emp = db.query(Employee).filter(Employee.email == body.email).first()
    if not emp or not verify_password(body.password, emp.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not emp.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

    token = create_access_token(
        user_id=emp.id,
        role=emp.role.value,
        company_id=emp.company_id,
    )
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserOut)
def me(current_user: Employee = Depends(get_current_user)):
    return current_user
