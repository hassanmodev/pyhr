"""Role enum (auth + permissions). Login identity lives on `Employee`."""

from __future__ import annotations

import enum


class UserRole(str, enum.Enum):
    SYSTEM_ADMIN = "system_admin"
    HR_MANAGER = "hr_manager"
    EMPLOYEE = "employee"
