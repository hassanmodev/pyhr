from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from src.core.deps import get_current_user, require_roles
from src.database import get_db
from src.models.company import Company
from src.models.department import Department
from src.models.employee import Employee, EmployeeStatus
from src.models.user import UserRole
from src.schemas.department import DeptCreate, DeptOut, DeptUpdate

router = APIRouter(prefix="/departments", tags=["departments"])

_admin_or_hr = require_roles(UserRole.SYSTEM_ADMIN, UserRole.HR_MANAGER)


def _assert_company_scope(current_user: Employee, company_id: int) -> None:
    if current_user.role == UserRole.HR_MANAGER and current_user.company_id != company_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access restricted to your company")


def _build_out(dept: Department, active_count: int) -> DeptOut:
    return DeptOut(
        id=dept.id,
        name=dept.name,
        company_id=dept.company_id,
        active_employee_count=active_count,
        created_at=dept.created_at,
    )


def _active_counts(db: Session, dept_ids: list[int]) -> dict[int, int]:
    if not dept_ids:
        return {}
    return dict(
        db.query(Employee.department_id, func.count(Employee.id))
        .filter(
            Employee.department_id.in_(dept_ids),
            Employee.status == EmployeeStatus.ACTIVE,
        )
        .group_by(Employee.department_id)
        .all()
    )


@router.get(
    "/",
    response_model=list[DeptOut],
    summary="List departments",
    description="Admins see all departments. HR Managers see only their company's departments. "
    "Use `company_id` query param to filter (admin only).",
)
def list_departments(
    company_id: int | None = Query(default=None, description="Filter by company (admin only)"),
    db: Session = Depends(get_db),
    current_user: Employee = Depends(_admin_or_hr),
):
    q = db.query(Department)
    if current_user.role == UserRole.HR_MANAGER:
        q = q.filter(Department.company_id == current_user.company_id)
    elif company_id is not None:
        q = q.filter(Department.company_id == company_id)

    depts = q.order_by(Department.name).all()
    counts = _active_counts(db, [d.id for d in depts])
    return [_build_out(d, counts.get(d.id, 0)) for d in depts]


@router.post(
    "/",
    response_model=DeptOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a department",
)
def create_department(
    body: DeptCreate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(_admin_or_hr),
):
    _assert_company_scope(current_user, body.company_id)

    if not db.get(Company, body.company_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

    exists = (
        db.query(Department)
        .filter_by(name=body.name, company_id=body.company_id)
        .first()
    )
    if exists:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Department name already exists in this company")

    dept = Department(name=body.name, company_id=body.company_id)
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return _build_out(dept, 0)


@router.get(
    "/{dept_id}",
    response_model=DeptOut,
    summary="Get a department",
    description="Includes the current count of active employees. "
    "Employees may only fetch their own department.",
)
def get_department(
    dept_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(get_current_user),
):
    dept = db.get(Department, dept_id)
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")

    if current_user.role == UserRole.EMPLOYEE:
        if current_user.department_id != dept_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access restricted to your own department")
    elif current_user.role == UserRole.HR_MANAGER:
        _assert_company_scope(current_user, dept.company_id)

    counts = _active_counts(db, [dept_id])
    return _build_out(dept, counts.get(dept_id, 0))


@router.patch(
    "/{dept_id}",
    response_model=DeptOut,
    summary="Update a department",
)
def update_department(
    dept_id: int,
    body: DeptUpdate,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(_admin_or_hr),
):
    dept = db.get(Department, dept_id)
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
    _assert_company_scope(current_user, dept.company_id)

    if body.name is not None:
        conflict = (
            db.query(Department)
            .filter(
                Department.name == body.name,
                Department.company_id == dept.company_id,
                Department.id != dept_id,
            )
            .first()
        )
        if conflict:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Department name already exists in this company")
        dept.name = body.name

    db.commit()
    db.refresh(dept)
    counts = _active_counts(db, [dept_id])
    return _build_out(dept, counts.get(dept_id, 0))


@router.delete(
    "/{dept_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a department",
)
def delete_department(
    dept_id: int,
    db: Session = Depends(get_db),
    current_user: Employee = Depends(_admin_or_hr),
):
    dept = db.get(Department, dept_id)
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
    _assert_company_scope(current_user, dept.company_id)
    db.delete(dept)
    db.commit()
