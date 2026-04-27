from functools import wraps
from typing import Callable

import jwt
from flask import abort, g, request
from sqlalchemy.orm import Session

from src.core.security import decode_access_token
from src.database import SessionLocal
from src.models.employee import Employee
from src.models.user import UserRole


def get_db() -> Session:
    """Return a per-request DB session cached in Flask g (one connection per request)."""
    if "db" not in g:
        g.db = SessionLocal()
    return g.db


def get_current_user() -> Employee:
    """Return the authenticated user, cached in g for the lifetime of the request."""
    if "current_user" in g:
        return g.current_user

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        abort(401, "Missing or invalid authorization header")

    token = auth_header[7:]

    try:
        payload = decode_access_token(token)
    except jwt.ExpiredSignatureError:
        abort(401, "Token expired")
    except jwt.PyJWTError:
        abort(401, "Invalid token")

    emp = get_db().get(Employee, int(payload["sub"]))
    if not emp or not emp.is_active:
        abort(401, "User not found")

    g.current_user = emp
    return emp


def require_roles(*roles: UserRole) -> Callable:
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs):
            current_user = get_current_user()
            if current_user.role not in roles:
                abort(403, "Insufficient permissions")
            return f(*args, **kwargs)
        return decorated_function
    return decorator
