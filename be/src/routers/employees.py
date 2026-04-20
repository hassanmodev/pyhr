from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from src.core.deps import get_current_user, require_roles
from src.core.rbac import assert_can_assign_role, assert_may_set_user_role
from src.core.security import hash_password
from src.database import get_db
from src.models.company import Company
from src.models.department import Department
from src.models.employee import Employee
from src.models.user import User, UserRole
from src.schemas.employee import EmployeeCreate, EmployeeOut, EmployeeUpdate

router = APIRouter(prefix="/employees", tags=["employees"])

_admin_or_hr = require_roles(UserRole.SYSTEM_ADMIN, UserRole.HR_MANAGER)


def _assert_company_scope(current_user: User, company_id: int) -> None:
    if current_user.role == UserRole.HR_MANAGER and current_user.company_id != company_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access restricted to your company")


def _user_company_id_for_role(role: UserRole, employee_company_id: int) -> int | None:
    if role == UserRole.SYSTEM_ADMIN:
        return None
    return employee_company_id


def _assert_dept_belongs_to_company(db: Session, department_id: int | None, company_id: int) -> None:
    """Relational integrity: department must belong to the selected company."""
    if department_id is None:
        return
    dept = db.get(Department, department_id)
    if not dept:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
    if dept.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Department does not belong to the selected company",
        )


@router.get(
    "/me",
    response_model=EmployeeOut,
    summary="Get own employee profile",
    description="Accessible to any authenticated user with a linked employee record. "
    "This is the primary endpoint for the Employee role.",
)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not current_user.employee_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No employee profile linked to this account")
    employee = (
        db.query(Employee)
        .options(joinedload(Employee.user))
        .filter(Employee.id == current_user.employee_id)
        .one_or_none()
    )
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee profile not found")
    return employee


@router.get(
    "/",
    response_model=list[EmployeeOut],
    summary="List employees",
    description="Admins see all employees. HR Managers see only their company's employees. "
    "Use query params to filter.",
)
def list_employees(
    company_id: int | None = Query(default=None, description="Filter by company (admin only)"),
    department_id: int | None = Query(default=None, description="Filter by department"),
    status: str | None = Query(default=None, description="Filter by status: active | inactive"),
    db: Session = Depends(get_db),
    current_user: User = Depends(_admin_or_hr),
):
    q = db.query(Employee).options(joinedload(Employee.user))

    if current_user.role == UserRole.HR_MANAGER:
        q = q.filter(Employee.company_id == current_user.company_id)
    elif company_id is not None:
        q = q.filter(Employee.company_id == company_id)

    if department_id is not None:
        q = q.filter(Employee.department_id == department_id)

    if status is not None:
        q = q.filter(Employee.status == status)

    return q.order_by(Employee.last_name, Employee.first_name).all()


@router.post(
    "/",
    response_model=EmployeeOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create an employee",
    description="Creates the employee record and automatically provisions a User account "
    "with the supplied `password`. The `department` must belong to the `company`.",
)
def create_employee(
    body: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_admin_or_hr),
):
    _assert_company_scope(current_user, body.company_id)

    if not db.get(Company, body.company_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")

    _assert_dept_belongs_to_company(db, body.department_id, body.company_id)

    if db.query(Employee).filter_by(email=body.email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use")

    if db.query(User).filter_by(email=body.email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A user account with this email already exists")

    assert_can_assign_role(current_user.role, body.role)

    employee = Employee(
        first_name=body.first_name,
        last_name=body.last_name,
        email=body.email,
        mobile=body.mobile,
        address=body.address,
        title=body.title,
        hire_date=body.hire_date,
        status=body.status,
        department_id=body.department_id,
        company_id=body.company_id,
    )
    db.add(employee)
    db.flush()

    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        role=body.role,
        employee_id=employee.id,
        company_id=_user_company_id_for_role(body.role, body.company_id),
    )
    db.add(user)
    db.commit()
    db.refresh(employee)
    employee = (
        db.query(Employee)
        .options(joinedload(Employee.user))
        .filter(Employee.id == employee.id)
        .one()
    )
    return employee


@router.get(
    "/{employee_id}",
    response_model=EmployeeOut,
    summary="Get an employee",
    description="Returns full profile including auto-calculated `days_employed`.",
)
def get_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_admin_or_hr),
):
    employee = (
        db.query(Employee)
        .options(joinedload(Employee.user))
        .filter(Employee.id == employee_id)
        .one_or_none()
    )
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    _assert_company_scope(current_user, employee.company_id)
    return employee


@router.patch(
    "/{employee_id}",
    response_model=EmployeeOut,
    summary="Update an employee",
    description="All fields are optional. If `department_id` is provided it must belong to the employee's company.",
)
def update_employee(
    employee_id: int,
    body: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(_admin_or_hr),
):
    employee = (
        db.query(Employee)
        .options(joinedload(Employee.user))
        .filter(Employee.id == employee_id)
        .one_or_none()
    )
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    _assert_company_scope(current_user, employee.company_id)

    target_company_id = body.company_id if body.company_id is not None else employee.company_id

    if body.department_id is not None or body.company_id is not None:
        target_dept_id = body.department_id if body.department_id is not None else employee.department_id
        _assert_dept_belongs_to_company(db, target_dept_id, target_company_id)

    payload = body.model_dump(exclude_unset=True)
    new_role = payload.pop("role", None)

    if body.email is not None and body.email != employee.email:
        if db.query(Employee).filter(Employee.email == body.email, Employee.id != employee_id).first():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already in use")
        # Keep user account email in sync
        linked_user = db.query(User).filter_by(employee_id=employee_id).first()
        if linked_user:
            linked_user.email = body.email

    for field, value in payload.items():
        setattr(employee, field, value)

    if new_role is not None:
        linked_user = employee.user or db.query(User).filter_by(employee_id=employee_id).first()
        if not linked_user:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="No user account linked to this employee",
            )
        assert_may_set_user_role(current_user.role, linked_user.role, new_role)
        linked_user.role = new_role
        linked_user.company_id = _user_company_id_for_role(new_role, employee.company_id)

    db.commit()
    db.refresh(employee)
    employee = (
        db.query(Employee)
        .options(joinedload(Employee.user))
        .filter(Employee.id == employee_id)
        .one()
    )
    return employee


@router.delete(
    "/{employee_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an employee",
    description="Also removes the associated user account.",
)
def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(_admin_or_hr),
):
    employee = db.get(Employee, employee_id)
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    _assert_company_scope(current_user, employee.company_id)

    linked_user = db.query(User).filter_by(employee_id=employee_id).first()
    if linked_user:
        db.delete(linked_user)

    db.delete(employee)
    db.commit()
