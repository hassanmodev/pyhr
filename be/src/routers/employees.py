from datetime import date

from flask import Blueprint, abort, jsonify, request
from sqlalchemy.orm import Session, joinedload

from src.core.deps import get_current_user, get_db, require_roles
from src.core.rbac import assert_can_assign_role, assert_may_set_user_role
from src.core.security import hash_password
from src.core.validation import (
    validate_email,
    validate_hire_date,
    validate_mobile,
    validate_name,
    validate_password,
)
from src.models.company import Company
from src.models.department import Department
from src.models.employee import Employee, EmployeeStatus
from src.models.user import UserRole

bp = Blueprint("employees", __name__)


def _build_out(employee: Employee) -> dict:
    """Build employee output dict with computed fields and department_name."""
    return {
        "id": employee.id,
        "first_name": employee.first_name,
        "last_name": employee.last_name,
        "full_name": employee.full_name,
        "email": employee.email,
        "mobile": employee.mobile,
        "address": employee.address,
        "title": employee.title,
        "hire_date": employee.hire_date.isoformat() if employee.hire_date else None,
        "status": employee.status.value,
        "department_id": employee.department_id,
        "department_name": employee.department.name if employee.department else None,
        "company_id": employee.company_id,
        "company_name": employee.company_name,
        "days_employed": employee.days_employed,
        "created_at": employee.created_at.isoformat() if employee.created_at else None,
        "role": employee.role.value,
    }


def _assert_company_scope(current_user: Employee, company_id: int | None) -> None:
    if company_id is None:
        if current_user.role != UserRole.SYSTEM_ADMIN:
            abort(403, "Access restricted to system administrators")
        return
    if current_user.role == UserRole.HR_MANAGER and current_user.company_id != company_id:
        abort(403, "Access restricted to your company")


def _user_company_id_for_role(role: UserRole, employee_company_id: int | None) -> int | None:
    if role == UserRole.SYSTEM_ADMIN:
        return None
    return employee_company_id


def _assert_dept_belongs_to_company(db: Session, department_id: int | None, company_id: int | None) -> None:
    if department_id is None or company_id is None:
        return
    dept = db.get(Department, department_id)
    if not dept:
        abort(404, "Department not found")
    if dept.company_id != company_id:
        abort(422, "Department does not belong to the selected company")


def _parse_date(date_str: str) -> date:
    """Parse ISO date string to date object."""
    try:
        return date.fromisoformat(date_str)
    except (ValueError, TypeError):
        abort(422, "Invalid date format. Use YYYY-MM-DD")


def _parse_role(role_str: str) -> UserRole:
    """Parse role string to UserRole enum."""
    try:
        return UserRole(role_str)
    except ValueError:
        abort(422, f"Invalid role. Must be one of: system_admin, hr_manager, employee")


def _parse_status(status_str: str) -> EmployeeStatus:
    """Parse status string to EmployeeStatus enum."""
    try:
        return EmployeeStatus(status_str)
    except ValueError:
        abort(422, f"Invalid status. Must be one of: active, inactive")


@bp.route("/me", methods=["GET"])
def get_my_profile():
    """Full HR profile for the authenticated user (includes `days_employed`, names, role).
    ---
    tags:
      - employees
    summary: Get my employee profile
    description: >
      Same shape as admin/HR `GET /employees/{id}` but always for the caller.
      Not to be confused with `GET /auth/me` (smaller auth-only payload).
    security:
      - Bearer: []
    produces:
      - application/json
    responses:
      200:
        description: Full employee record
        schema:
          $ref: '#/definitions/EmployeeOut'
      401:
        schema:
          $ref: '#/definitions/ApiError'
    """
    current_user = get_current_user()
    db = get_db()

    employee = (
        db.query(Employee)
        .options(joinedload(Employee.company), joinedload(Employee.department))
        .filter(Employee.id == current_user.id)
        .one_or_none()
    )
    return jsonify(_build_out(employee))


@bp.route("/", methods=["GET"])
@require_roles(UserRole.SYSTEM_ADMIN, UserRole.HR_MANAGER)
def list_employees():
    """List employees (admin: optional filters; HR: always own company).
    ---
    tags:
      - employees
    summary: List employees
    description: >
      **HR manager:** results are always restricted to `company_id` of the caller;
      `company_id` query is ignored.
      **System admin:** optional `company_id` narrows the list.
    security:
      - Bearer: []
    produces:
      - application/json
    parameters:
      - in: query
        name: company_id
        type: integer
        required: false
        description: Filter by company (system admin only)
      - in: query
        name: department_id
        type: integer
        required: false
        description: Filter by department id
      - in: query
        name: status
        type: string
        enum: [active, inactive]
        required: false
        description: Filter by employment status
    responses:
      200:
        description: Array of employees
        schema:
          type: array
          items:
            $ref: '#/definitions/EmployeeOut'
      401:
        schema:
          $ref: '#/definitions/ApiError'
      403:
        schema:
          $ref: '#/definitions/ApiError'
      422:
        description: Invalid status filter
        schema:
          $ref: '#/definitions/ApiError'
    """
    company_id = request.args.get("company_id", type=int)
    department_id = request.args.get("department_id", type=int)
    status = request.args.get("status")

    current_user = get_current_user()
    db = get_db()

    q = db.query(Employee).options(joinedload(Employee.company), joinedload(Employee.department))

    if current_user.role == UserRole.HR_MANAGER:
        q = q.filter(Employee.company_id == current_user.company_id)
    elif company_id is not None:
        q = q.filter(Employee.company_id == company_id)

    if department_id is not None:
        q = q.filter(Employee.department_id == department_id)

    if status is not None:
        try:
            status_enum = EmployeeStatus(status)
            q = q.filter(Employee.status == status_enum)
        except ValueError:
            abort(422, "Invalid status filter. Use 'active' or 'inactive'")

    employees = q.order_by(Employee.last_name, Employee.first_name).all()
    return jsonify([_build_out(e) for e in employees])


@bp.route("/", methods=["POST"])
@require_roles(UserRole.SYSTEM_ADMIN, UserRole.HR_MANAGER)
def create_employee():
    """Create an employee row (profile + hashed password + role).
    ---
    tags:
      - employees
    summary: Create employee
    description: >
      `department_id` must belong to the same `company_id` when both are set.
      Creating a **system_admin** sets `company_id` / `department_id` to null;
      only appropriate callers may assign that role (see RBAC in code).
    security:
      - Bearer: []
    consumes:
      - application/json
    produces:
      - application/json
    parameters:
      - in: body
        name: body
        required: true
        schema:
          $ref: '#/definitions/EmployeeCreate'
    responses:
      201:
        description: Created employee
        schema:
          $ref: '#/definitions/EmployeeOut'
      401:
        schema:
          $ref: '#/definitions/ApiError'
      403:
        description: Company scope or role assignment denied
        schema:
          $ref: '#/definitions/ApiError'
      404:
        description: Company or department not found
        schema:
          $ref: '#/definitions/ApiError'
      409:
        description: Email already in use
        schema:
          $ref: '#/definitions/ApiError'
      422:
        description: Validation or department/company mismatch
        schema:
          $ref: '#/definitions/ApiError'
    """
    data = request.get_json()
    if not data:
        abort(422, "Request body is required")

    required_fields = ["first_name", "last_name", "email", "mobile", "title", "hire_date", "company_id", "password"]
    for field in required_fields:
        if field not in data:
            abort(422, f"{field} is required")

    current_user = get_current_user()
    db = get_db()

    # Validate inputs
    try:
        first_name = validate_name(data["first_name"], "First name")
        last_name = validate_name(data["last_name"], "Last name")
        email = validate_email(data["email"])
        mobile = validate_mobile(data["mobile"])
        title = data["title"].strip()
        if not title:
            abort(422, "Title cannot be empty")
        hire_date = validate_hire_date(_parse_date(data["hire_date"]))
        password = validate_password(data["password"])
    except ValueError as e:
        abort(422, str(e))

    role = _parse_role(data.get("role", "employee"))
    company_id = data["company_id"]
    department_id = data.get("department_id")
    status = _parse_status(data.get("status", "active"))
    address = data.get("address")

    target_company_id = None if role == UserRole.SYSTEM_ADMIN else company_id
    _assert_company_scope(current_user, target_company_id)

    if target_company_id is not None and not db.get(Company, target_company_id):
        abort(404, "Company not found")

    _assert_dept_belongs_to_company(db, department_id, target_company_id)

    if db.query(Employee).filter_by(email=email).first():
        abort(409, "Email already in use")

    assert_can_assign_role(current_user.role, role)

    employee = Employee(
        first_name=first_name,
        last_name=last_name,
        email=email,
        mobile=mobile,
        address=address,
        title=title,
        hire_date=hire_date,
        status=status,
        department_id=department_id,
        company_id=_user_company_id_for_role(role, target_company_id),
        password_hash=hash_password(password),
        role=role,
        is_active=True,
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)

    # Reload with relationships
    employee = (
        db.query(Employee)
        .options(joinedload(Employee.company), joinedload(Employee.department))
        .filter(Employee.id == employee.id)
        .one()
    )
    return jsonify(_build_out(employee)), 201


@bp.route("/<int:employee_id>", methods=["GET"])
@require_roles(UserRole.SYSTEM_ADMIN, UserRole.HR_MANAGER)
def get_employee(employee_id: int):
    """Get one employee by id (full profile including `days_employed`).
    ---
    tags:
      - employees
    summary: Get employee
    security:
      - Bearer: []
    produces:
      - application/json
    parameters:
      - in: path
        name: employee_id
        type: integer
        required: true
    responses:
      200:
        schema:
          $ref: '#/definitions/EmployeeOut'
      401:
        schema:
          $ref: '#/definitions/ApiError'
      403:
        description: Outside company scope (e.g. HR viewing other company)
        schema:
          $ref: '#/definitions/ApiError'
      404:
        schema:
          $ref: '#/definitions/ApiError'
    """
    current_user = get_current_user()
    db = get_db()

    employee = (
        db.query(Employee)
        .options(joinedload(Employee.company), joinedload(Employee.department))
        .filter(Employee.id == employee_id)
        .one_or_none()
    )
    if not employee:
        abort(404, "Employee not found")

    _assert_company_scope(current_user, employee.company_id)
    return jsonify(_build_out(employee))


@bp.route("/<int:employee_id>", methods=["PATCH"])
@require_roles(UserRole.SYSTEM_ADMIN, UserRole.HR_MANAGER)
def update_employee(employee_id: int):
    """Partial update of an employee (no password change in this endpoint).
    ---
    tags:
      - employees
    summary: Update employee
    description: >
      Send only fields to change. Changing `role` may clear `company_id` for
      system_admin per server rules. Department must belong to the target company.
    security:
      - Bearer: []
    consumes:
      - application/json
    produces:
      - application/json
    parameters:
      - in: path
        name: employee_id
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          $ref: '#/definitions/EmployeePatch'
    responses:
      200:
        schema:
          $ref: '#/definitions/EmployeeOut'
      401:
        schema:
          $ref: '#/definitions/ApiError'
      403:
        schema:
          $ref: '#/definitions/ApiError'
      404:
        schema:
          $ref: '#/definitions/ApiError'
      409:
        description: Email conflict
        schema:
          $ref: '#/definitions/ApiError'
      422:
        schema:
          $ref: '#/definitions/ApiError'
    """
    data = request.get_json()
    if not data:
        abort(422, "Request body is required")

    current_user = get_current_user()
    db = get_db()

    employee = (
        db.query(Employee)
        .options(joinedload(Employee.company), joinedload(Employee.department))
        .filter(Employee.id == employee_id)
        .one_or_none()
    )
    if not employee:
        abort(404, "Employee not found")

    _assert_company_scope(current_user, employee.company_id)

    # Validate and update fields
    if "first_name" in data and data["first_name"] is not None:
        try:
            employee.first_name = validate_name(data["first_name"], "First name")
        except ValueError as e:
            abort(422, str(e))

    if "last_name" in data and data["last_name"] is not None:
        try:
            employee.last_name = validate_name(data["last_name"], "Last name")
        except ValueError as e:
            abort(422, str(e))

    if "email" in data and data["email"] is not None:
        try:
            new_email = validate_email(data["email"])
            if new_email != employee.email:
                if db.query(Employee).filter(Employee.email == new_email, Employee.id != employee_id).first():
                    abort(409, "Email already in use")
            employee.email = new_email
        except ValueError as e:
            abort(422, str(e))

    if "mobile" in data and data["mobile"] is not None:
        try:
            employee.mobile = validate_mobile(data["mobile"])
        except ValueError as e:
            abort(422, str(e))

    if "title" in data and data["title"] is not None:
        title = data["title"].strip()
        if not title:
            abort(422, "Title cannot be empty")
        employee.title = title

    if "address" in data:
        employee.address = data["address"]

    if "hire_date" in data and data["hire_date"] is not None:
        try:
            employee.hire_date = validate_hire_date(_parse_date(data["hire_date"]))
        except ValueError as e:
            abort(422, str(e))

    if "status" in data and data["status"] is not None:
        employee.status = _parse_status(data["status"])

    # Handle department and company relationship
    target_company_id = data.get("company_id") if data.get("company_id") is not None else employee.company_id
    target_dept_id = data.get("department_id") if data.get("department_id") is not None else employee.department_id

    if "department_id" in data or "company_id" in data:
        _assert_dept_belongs_to_company(db, target_dept_id, target_company_id)

    if "department_id" in data:
        employee.department_id = data["department_id"]

    if "company_id" in data and data["company_id"] is not None:
        employee.company_id = data["company_id"]

    # Handle role change
    if "role" in data and data["role"] is not None:
        new_role = _parse_role(data["role"])
        assert_may_set_user_role(current_user.role, employee.role, new_role)
        employee.role = new_role
        employee.company_id = _user_company_id_for_role(new_role, employee.company_id)

    db.commit()
    db.refresh(employee)

    # Reload with relationships
    employee = (
        db.query(Employee)
        .options(joinedload(Employee.company), joinedload(Employee.department))
        .filter(Employee.id == employee_id)
        .one()
    )
    return jsonify(_build_out(employee))


@bp.route("/<int:employee_id>", methods=["DELETE"])
@require_roles(UserRole.SYSTEM_ADMIN, UserRole.HR_MANAGER)
def delete_employee(employee_id: int):
    """Delete an employee row (removes login for that email).
    ---
    tags:
      - employees
    summary: Delete employee
    security:
      - Bearer: []
    parameters:
      - in: path
        name: employee_id
        type: integer
        required: true
    responses:
      204:
        description: No content — deleted
      401:
        schema:
          $ref: '#/definitions/ApiError'
      403:
        schema:
          $ref: '#/definitions/ApiError'
      404:
        schema:
          $ref: '#/definitions/ApiError'
    """
    current_user = get_current_user()
    db = get_db()

    employee = db.get(Employee, employee_id)
    if not employee:
        abort(404, "Employee not found")

    _assert_company_scope(current_user, employee.company_id)

    db.delete(employee)
    db.commit()

    return "", 204
