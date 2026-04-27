from flask import Blueprint, abort, g, jsonify, request
from sqlalchemy.orm import Session

from src.core.deps import get_current_user, get_db
from src.core.security import create_access_token, verify_password
from src.core.validation import validate_email
from src.models.employee import Employee, EmployeeStatus
from src.models.user import UserRole

bp = Blueprint("auth", __name__)


@bp.route("/login", methods=["POST"])
def login():
    """Authenticate and receive JWT token."""
    data = request.get_json()
    if not data or "email" not in data or "password" not in data:
        abort(422, "Email and password are required")

    email = data["email"]
    password = data["password"]

    try:
        email = validate_email(email)
    except ValueError as e:
        abort(422, str(e))

    db = get_db()
    emp = db.query(Employee).filter(Employee.email == email).first()

    if not emp or not verify_password(password, emp.password_hash):
        abort(401, "Invalid credentials")

    # Fix: Check both is_active AND status - inactive employees cannot login
    if not emp.is_active or emp.status == EmployeeStatus.INACTIVE:
        abort(403, "Account disabled")

    token = create_access_token(
        user_id=emp.id,
        role=emp.role.value,
        company_id=emp.company_id,
    )
    return jsonify({"access_token": token, "token_type": "bearer"})


@bp.route("/me", methods=["GET"])
def me():
    """Get current authenticated user profile."""
    current_user = get_current_user()
    return jsonify({
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role.value,
        "company_id": current_user.company_id,
        "is_active": current_user.is_active,
    })
