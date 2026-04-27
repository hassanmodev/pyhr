from flask import Blueprint, abort, jsonify, request
from sqlalchemy import func
from sqlalchemy.orm import Session

from src.core.deps import get_current_user, get_db, require_roles
from src.core.validation import validate_required_string
from src.models.company import Company
from src.models.department import Department
from src.models.employee import Employee, EmployeeStatus
from src.models.user import UserRole

bp = Blueprint("departments", __name__)


def _build_out(dept: Department, active_count: int) -> dict:
    return {
        "id": dept.id,
        "name": dept.name,
        "company_id": dept.company_id,
        "active_employee_count": active_count,
        "created_at": dept.created_at.isoformat() if dept.created_at else None,
    }


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


def _assert_company_scope(current_user: Employee, company_id: int) -> None:
    if current_user.role == UserRole.HR_MANAGER and current_user.company_id != company_id:
        abort(403, "Access restricted to your company")


@bp.route("/", methods=["GET"])
@require_roles(UserRole.SYSTEM_ADMIN, UserRole.HR_MANAGER)
def list_departments():
    """List departments. Admins see all departments. HR Managers see only their company's departments.
    ---
    tags:
      - departments
    summary: List departments
    security:
      - Bearer: []
    parameters:
      - in: query
        name: company_id
        type: integer
        required: false
        description: Filter by company (system admin only; ignored for HR managers)
    responses:
      200:
        description: Departments with active employee counts
        schema:
          type: array
          items:
            type: object
      403:
        description: Forbidden
    """
    company_id = request.args.get("company_id", type=int)
    current_user = get_current_user()
    db = get_db()

    q = db.query(Department)
    if current_user.role == UserRole.HR_MANAGER:
        q = q.filter(Department.company_id == current_user.company_id)
    elif company_id is not None:
        q = q.filter(Department.company_id == company_id)

    depts = q.order_by(Department.name).all()
    counts = _active_counts(db, [d.id for d in depts])
    return jsonify([_build_out(d, counts.get(d.id, 0)) for d in depts])


@bp.route("/", methods=["POST"])
@require_roles(UserRole.SYSTEM_ADMIN, UserRole.HR_MANAGER)
def create_department():
    """Create a department.
    ---
    tags:
      - departments
    summary: Create department
    security:
      - Bearer: []
    consumes:
      - application/json
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          required:
            - name
            - company_id
          properties:
            name:
              type: string
            company_id:
              type: integer
    responses:
      201:
        description: Department created
        schema:
          type: object
      403:
        description: Outside company scope
      404:
        description: Company not found
      409:
        description: Duplicate name in company
      422:
        description: Validation error
    """
    data = request.get_json()
    if not data or "name" not in data or "company_id" not in data:
        abort(422, "Name and company_id are required")

    try:
        name = validate_required_string(data["name"], "Name")
    except ValueError as e:
        abort(422, str(e))

    company_id = data["company_id"]
    current_user = get_current_user()
    db = get_db()

    _assert_company_scope(current_user, company_id)

    if not db.get(Company, company_id):
        abort(404, "Company not found")

    exists = (
        db.query(Department)
        .filter_by(name=name, company_id=company_id)
        .first()
    )
    if exists:
        abort(409, "Department name already exists in this company")

    dept = Department(name=name, company_id=company_id)
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return jsonify(_build_out(dept, 0)), 201


@bp.route("/<int:dept_id>", methods=["GET"])
def get_department(dept_id: int):
    """Get a single department. Includes the current count of active employees.
    Employees may only fetch their own department.
    ---
    tags:
      - departments
    summary: Get department
    security:
      - Bearer: []
    parameters:
      - in: path
        name: dept_id
        type: integer
        required: true
    responses:
      200:
        description: Department with active employee count
        schema:
          type: object
      403:
        description: Outside allowed scope
      404:
        description: Department not found
    """
    current_user = get_current_user()
    db = get_db()

    dept = db.get(Department, dept_id)
    if not dept:
        abort(404, "Department not found")

    if current_user.role == UserRole.EMPLOYEE:
        if current_user.department_id != dept_id:
            abort(403, "Access restricted to your own department")
    elif current_user.role == UserRole.HR_MANAGER:
        _assert_company_scope(current_user, dept.company_id)

    counts = _active_counts(db, [dept_id])
    return jsonify(_build_out(dept, counts.get(dept_id, 0)))


@bp.route("/<int:dept_id>", methods=["PATCH"])
@require_roles(UserRole.SYSTEM_ADMIN, UserRole.HR_MANAGER)
def update_department(dept_id: int):
    """Update a department.
    ---
    tags:
      - departments
    summary: Update department
    security:
      - Bearer: []
    consumes:
      - application/json
    parameters:
      - in: path
        name: dept_id
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            name:
              type: string
    responses:
      200:
        description: Updated department
        schema:
          type: object
      403:
        description: Outside company scope
      404:
        description: Department not found
      409:
        description: Name conflict
      422:
        description: Validation error
    """
    data = request.get_json()
    if not data:
        abort(422, "Request body is required")

    current_user = get_current_user()
    db = get_db()

    dept = db.get(Department, dept_id)
    if not dept:
        abort(404, "Department not found")

    _assert_company_scope(current_user, dept.company_id)

    if "name" in data and data["name"] is not None:
        try:
            name = validate_required_string(data["name"], "Name")
        except ValueError as e:
            abort(422, str(e))

        conflict = (
            db.query(Department)
            .filter(
                Department.name == name,
                Department.company_id == dept.company_id,
                Department.id != dept_id,
            )
            .first()
        )
        if conflict:
            abort(409, "Department name already exists in this company")
        dept.name = name

    db.commit()
    db.refresh(dept)
    counts = _active_counts(db, [dept_id])
    return jsonify(_build_out(dept, counts.get(dept_id, 0)))


@bp.route("/<int:dept_id>", methods=["DELETE"])
@require_roles(UserRole.SYSTEM_ADMIN, UserRole.HR_MANAGER)
def delete_department(dept_id: int):
    """Delete a department.
    ---
    tags:
      - departments
    summary: Delete department
    security:
      - Bearer: []
    parameters:
      - in: path
        name: dept_id
        type: integer
        required: true
    responses:
      204:
        description: Deleted
      403:
        description: Outside company scope
      404:
        description: Department not found
    """
    current_user = get_current_user()
    db = get_db()

    dept = db.get(Department, dept_id)
    if not dept:
        abort(404, "Department not found")

    _assert_company_scope(current_user, dept.company_id)
    db.delete(dept)
    db.commit()

    return "", 204
