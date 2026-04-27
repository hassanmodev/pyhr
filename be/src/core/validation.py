"""Input validation utilities (replaces Pydantic validation for Flask)."""

import re
from datetime import date
from email_validator import validate_email as validate_email_lib, EmailNotValidError

_MOBILE_RE = re.compile(r"^[\+]?[\d\s\(\)\-\.]{7,30}$")
_NAME_RE = re.compile(r"^[a-zA-Z\s\-'\.]+$")


def validate_email(email: str) -> str:
    """Validate email format."""
    try:
        validated = validate_email_lib(email.strip(), check_deliverability=False)
        return validated.email
    except EmailNotValidError as e:
        raise ValueError(f"Invalid email format: {e}")


def validate_mobile(mobile: str | None) -> str | None:
    """Validate mobile number format."""
    if mobile is None:
        return None
    mobile = mobile.strip()
    if not _MOBILE_RE.match(mobile):
        raise ValueError("Invalid mobile number format")
    digits_only = re.sub(r"\D", "", mobile)
    if len(digits_only) < 7:
        raise ValueError("Mobile number must contain at least 7 digits")
    return mobile


def validate_name(name: str, field_name: str = "Name") -> str:
    """Validate name contains only letters, spaces, hyphens, and apostrophes."""
    name = name.strip()
    if not name:
        raise ValueError(f"{field_name} cannot be empty")
    if not _NAME_RE.match(name):
        raise ValueError(f"{field_name} must contain only letters, spaces, hyphens, apostrophes, and periods")
    return name


def validate_password(password: str) -> str:
    """Validate password strength."""
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long")
    if not re.search(r"[A-Z]", password):
        raise ValueError("Password must contain at least one uppercase letter")
    if not re.search(r"[a-z]", password):
        raise ValueError("Password must contain at least one lowercase letter")
    if not re.search(r"\d", password):
        raise ValueError("Password must contain at least one digit")
    return password


def validate_hire_date(hire_date: date) -> date:
    """Validate hire date is not in the future."""
    if hire_date > date.today():
        raise ValueError("Hire date cannot be in the future")
    return hire_date


def validate_required_string(value: str, field_name: str) -> str:
    """Validate a required string field."""
    value = value.strip()
    if not value:
        raise ValueError(f"{field_name} cannot be empty")
    return value
