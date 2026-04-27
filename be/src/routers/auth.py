from flask import Blueprint, abort, jsonify, request

from src.core.deps import get_current_user, get_db
from src.core.security import create_access_token, verify_password
from src.core.validation import validate_email
from src.models.employee import Employee, EmployeeStatus

bp = Blueprint("auth", __name__)


@bp.route("/login", methods=["POST"])
def login():
    """Authenticate with email and password; returns a JWT access token.
    ---
    tags:
      - auth
    summary: Login
    description: >
      No Bearer header. On success, use `access_token` as
      `Authorization: Bearer <token>`. Returns 401 for wrong credentials;
      403 if the account is disabled (`is_active` false or employment status inactive).
    consumes:
      - application/json
    produces:
      - application/json
    parameters:
      - in: body
        name: body
        required: true
        schema:
          $ref: '#/definitions/LoginRequest'
    responses:
      200:
        description: Token issued
        schema:
          $ref: '#/definitions/TokenResponse'
      401:
        description: Invalid credentials
        schema:
          $ref: '#/definitions/ApiError'
      403:
        description: Account disabled
        schema:
          $ref: '#/definitions/ApiError'
      422:
        description: Missing fields or invalid email
        schema:
          $ref: '#/definitions/ApiError'
    """
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
    """Return the authenticated principal (id, email, role, company_id, is_active).
    ---
    tags:
      - auth
    summary: Current user (auth slice)
    description: >
      Lightweight identity — not the full HR profile. For full employee fields
      including `days_employed`, use `GET /employees/me`.
    security:
      - Bearer: []
    produces:
      - application/json
    responses:
      200:
        description: OK
        schema:
          $ref: '#/definitions/AuthMeOut'
      401:
        description: Missing or invalid token
        schema:
          $ref: '#/definitions/ApiError'
    """
    current_user = get_current_user()
    return jsonify({
        "id": current_user.id,
        "email": current_user.email,
        "role": current_user.role.value,
        "company_id": current_user.company_id,
        "is_active": current_user.is_active,
    })
