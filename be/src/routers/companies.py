from flask import Blueprint, abort, jsonify, request
from sqlalchemy import func
from sqlalchemy.orm import Session

from src.core.deps import get_current_user, get_db, require_roles
from src.core.validation import validate_required_string
from src.models.company import Company
from src.models.department import Department
from src.models.employee import Employee, EmployeeStatus
from src.models.user import UserRole

bp = Blueprint("companies", __name__)


def _build_out(company: Company, dept_count: int, emp_count: int) -> dict:
    return {
        "id": company.id,
        "name": company.name,
        "total_departments": dept_count,
        "total_employees": emp_count,
        "created_at": company.created_at.isoformat() if company.created_at else None,
    }


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


@bp.route("/", methods=["GET"])
def list_companies():
    """List all companies. System admin: all companies. HR manager: their assigned company only."""
    user = get_current_user()
    db = get_db()

    if user.role == UserRole.SYSTEM_ADMIN:
        companies = db.query(Company).order_by(Company.name).all()
    elif user.role == UserRole.HR_MANAGER:
        if user.company_id is None:
            return jsonify([])
        c = db.get(Company, user.company_id)
        companies = [c] if c else []
    else:
        abort(403, "Insufficient permissions")

    if not companies:
        return jsonify([])

    ids = [c.id for c in companies]
    dept_counts, emp_counts = _fetch_stats(db, ids)
    return jsonify([_build_out(c, dept_counts.get(c.id, 0), emp_counts.get(c.id, 0)) for c in companies])


@bp.route("/", methods=["POST"])
@require_roles(UserRole.SYSTEM_ADMIN)
def create_company():
    """Create a new company."""
    data = request.get_json()
    if not data or "name" not in data:
        abort(422, "Name is required")

    try:
        name = validate_required_string(data["name"], "Name")
    except ValueError as e:
        abort(422, str(e))

    db = get_db()

    if db.query(Company).filter_by(name=name).first():
        abort(409, "Company name already exists")

    company = Company(name=name)
    db.add(company)
    db.commit()
    db.refresh(company)
    return jsonify(_build_out(company, 0, 0)), 201


@bp.route("/<int:company_id>", methods=["GET"])
@require_roles(UserRole.SYSTEM_ADMIN)
def get_company(company_id: int):
    """Get a single company."""
    db = get_db()
    company = db.get(Company, company_id)
    if not company:
        abort(404, "Company not found")

    dept_counts, emp_counts = _fetch_stats(db, [company_id])
    return jsonify(_build_out(company, dept_counts.get(company_id, 0), emp_counts.get(company_id, 0)))


@bp.route("/<int:company_id>", methods=["PATCH"])
@require_roles(UserRole.SYSTEM_ADMIN)
def update_company(company_id: int):
    """Update a company."""
    data = request.get_json()
    if not data:
        abort(422, "Request body is required")

    db = get_db()
    company = db.get(Company, company_id)
    if not company:
        abort(404, "Company not found")

    if "name" in data and data["name"] is not None:
        try:
            name = validate_required_string(data["name"], "Name")
        except ValueError as e:
            abort(422, str(e))

        conflict = (
            db.query(Company)
            .filter(Company.name == name, Company.id != company_id)
            .first()
        )
        if conflict:
            abort(409, "Company name already exists")
        company.name = name

    db.commit()
    db.refresh(company)
    dept_counts, emp_counts = _fetch_stats(db, [company_id])
    return jsonify(_build_out(company, dept_counts.get(company_id, 0), emp_counts.get(company_id, 0)))


@bp.route("/<int:company_id>", methods=["DELETE"])
@require_roles(UserRole.SYSTEM_ADMIN)
def delete_company(company_id: int):
    """Delete a company. Cascades to departments. Employees are blocked (FK RESTRICT) unless reassigned first."""
    db = get_db()
    company = db.get(Company, company_id)
    if not company:
        abort(404, "Company not found")

    db.delete(company)
    try:
        db.commit()
    except Exception:
        db.rollback()
        abort(409, "Cannot delete company with existing employees. Reassign or remove them first.")

    return "", 204
