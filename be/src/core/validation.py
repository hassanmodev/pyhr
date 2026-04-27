"""Input validation utilities (replaces Pydantic validation for Flask)."""

import re
from datetime import date
from email_validator import validate_email as validate_email_lib, EmailNotValidError

# Match `be/src/models/*.py` String/Text column limits
MAX_PERSON_NAME_LEN = 100  # first_name, last_name
MAX_EMAIL_LEN = 255
# Mobile: pattern below also enforces total length 7–30; models use String(30)
MAX_PASSWORD_LEN = 128
MAX_TITLE_LEN = 150
MAX_ORG_NAME_LEN = 255  # company.name, department.name
MAX_ADDRESS_LEN = 1000  # address is Text; keep a sane API limit

_MOBILE_RE = re.compile(r"^[\+]?[\d\s\(\)\-\.]{7,30}$")
_NAME_RE = re.compile(r"^[a-zA-Z\s\-'\.]+$")


def validate_email(email: str) -> str:
    """Validate email format."""
    try:
        validated = validate_email_lib(email.strip(), check_deliverability=False)
        out = validated.email
    except EmailNotValidError as e:
        raise ValueError(f"Invalid email format: {e}")
    if len(out) > MAX_EMAIL_LEN:
        raise ValueError(f"Email must be at most {MAX_EMAIL_LEN} characters")
    return out


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
    if len(name) > MAX_PERSON_NAME_LEN:
        raise ValueError(f"{field_name} must be at most {MAX_PERSON_NAME_LEN} characters")
    return name


def validate_password(password: str) -> str:
    """Validate password strength."""
    if len(password) > MAX_PASSWORD_LEN:
        raise ValueError(f"Password must be at most {MAX_PASSWORD_LEN} characters long")
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


def validate_title(value: str) -> str:
    """Job title: non-empty after strip, within DB String(150)."""
    t = value.strip()
    if not t:
        raise ValueError("Title cannot be empty")
    if len(t) > MAX_TITLE_LEN:
        raise ValueError(f"Title must be at most {MAX_TITLE_LEN} characters")
    return t


def validate_address(value: str | None) -> str | None:
    """Optional mailing address; Text in DB, capped for API safety."""
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError("Address must be a string or null")
    if len(value) > MAX_ADDRESS_LEN:
        raise ValueError(f"Address must be at most {MAX_ADDRESS_LEN} characters")
    return value


def validate_required_string(
    value: str, field_name: str, *, max_len: int | None = None
) -> str:
    """Validate a required string field (e.g. company/department name)."""
    value = value.strip()
    if not value:
        raise ValueError(f"{field_name} cannot be empty")
    limit = max_len if max_len is not None else MAX_ORG_NAME_LEN
    if len(value) > limit:
        raise ValueError(f"{field_name} must be at most {limit} characters")
    return value
