from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from src.core.deps import get_current_user, require_roles
from src.database import get_db
from src.models.company import Company
from src.models.department import Department
from src.models.employee import Employee, EmployeeStatus
from src.models.user import UserRole
from src.schemas.company import CompanyCreate, CompanyOut, CompanyUpdate

router = APIRouter(prefix="/companies", tags=["companies"])

_admin = require_roles(UserRole.SYSTEM_ADMIN)


def _build_out(company: Company, dept_count: int, emp_count: int) -> CompanyOut:
    return CompanyOut(
        id=company.id,
        name=company.name,
        total_departments=dept_count,
        total_employees=emp_count,
        created_at=company.created_at,
    )


def _fetch_stats(db: Session, company_ids: list[int]) -> tuple[dict, dict]:
    """Return (dept_counts, emp_counts) keyed by company_id — single query each."""
    dept_counts = dict(
        db.query(Department.company_id, func.count(Department.id))
        .filter(Department.company_id.in_(company_ids))
        .group_by(Department.company_id)
        .all()
    )
    emp_counts = dict(
        db.query(Employee.company_id, func.count(Employee.id))
        .filter(Employee.company_id.in_(company_ids), Employee.status == EmployeeStatus.ACTIVE)
        .group_by(Employee.company_id)
        .all()
    )
    return dept_counts, emp_counts


@router.get(
    "/",
    response_model=list[CompanyOut],
    summary="List companies",
    description="**System admin:** all companies. **HR manager:** their assigned company only.",
)
def list_companies(
    db: Session = Depends(get_db),
    user: Employee = Depends(get_current_user),
):
    if user.role == UserRole.SYSTEM_ADMIN:
        companies = db.query(Company).order_by(Company.name).all()
    elif user.role == UserRole.HR_MANAGER:
        if user.company_id is None:
            return []
        c = db.get(Company, user.company_id)
        companies = [c] if c else []
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")

    if not companies:
        return []
    ids = [c.id for c in companies]
    dept_counts, emp_counts = _fetch_stats(db, ids)
    return [_build_out(c, dept_counts.get(c.id, 0), emp_counts.get(c.id, 0)) for c in companies]


@router.post(
    "/",
    response_model=CompanyOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a company",
)
def create_company(
    body: CompanyCreate,
    db: Session = Depends(get_db),
    _: Employee = Depends(_admin),
):
    if db.query(Company).filter_by(name=body.name).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Company name already exists")
    company = Company(name=body.name)
    db.add(company)
    db.commit()
    db.refresh(company)
    return _build_out(company, 0, 0)


@router.get(
    "/{company_id}",
    response_model=CompanyOut,
    summary="Get a company",
)
def get_company(
    company_id: int,
    db: Session = Depends(get_db),
    _: Employee = Depends(_admin),
):
    company = db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    dept_counts, emp_counts = _fetch_stats(db, [company_id])
    return _build_out(company, dept_counts.get(company_id, 0), emp_counts.get(company_id, 0))


@router.patch(
    "/{company_id}",
    response_model=CompanyOut,
    summary="Update a company",
)
def update_company(
    company_id: int,
    body: CompanyUpdate,
    db: Session = Depends(get_db),
    _: Employee = Depends(_admin),
):
    company = db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    if body.name is not None:
        conflict = (
            db.query(Company)
            .filter(Company.name == body.name, Company.id != company_id)
            .first()
        )
        if conflict:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Company name already exists")
        company.name = body.name
    db.commit()
    db.refresh(company)
    dept_counts, emp_counts = _fetch_stats(db, [company_id])
    return _build_out(company, dept_counts.get(company_id, 0), emp_counts.get(company_id, 0))


@router.delete(
    "/{company_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a company",
    description="Cascades to departments. Employees are blocked (FK RESTRICT) unless reassigned first.",
)
def delete_company(
    company_id: int,
    db: Session = Depends(get_db),
    _: Employee = Depends(_admin),
):
    company = db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    db.delete(company)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete company with existing employees. Reassign or remove them first.",
        )
