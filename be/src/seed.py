"""
Seed the database with realistic initial data.

Run:  python seed.py
      python seed.py --reset   # drops all rows first (keeps schema)

Idempotent by default — skips records that already exist (matched by email /
unique name).  Use --reset to wipe and re-seed cleanly.
"""

from __future__ import annotations

import argparse
import sys
from datetime import date

import bcrypt
from sqlalchemy.orm import Session

from src.database import SessionLocal, engine
from src.models import Base, Company, Department, Employee, EmployeeStatus, User, UserRole

# ---------------------------------------------------------------------------
# Seed data
# ---------------------------------------------------------------------------

COMPANIES = [
    {"name": "CairoTech"},
    {"name": "AlexTrade"},
]

DEPARTMENTS: dict[str, list[str]] = {
    "CairoTech": ["Engineering", "Human Resources", "Finance"],
    "AlexTrade": ["Operations", "Marketing", "Legal"],
}

EMPLOYEES: dict[str, list[dict]] = {
    "Engineering": [
        {"first_name": "Youssef", "last_name": "Khalil", "email": "youssef.Khaled@cairotech.eg", "mobile": "+20 10 1234 5678", "title": "Backend Engineer",      "hire_date": date(2021, 3, 15)},
        {"first_name": "Nour",    "last_name": "Hassan",   "email": "nour.hassan@cairotech.eg",     "mobile": "+20 11 2345 6789", "title": "Frontend Engineer",     "hire_date": date(2022, 7, 1)},
        {"first_name": "Omar",    "last_name": "Khaled",   "email": "omar.khaled@cairotech.eg",     "mobile": "+20 12 3456 7890", "title": "DevOps Engineer",       "hire_date": date(2023, 1, 20)},
    ],
    "Human Resources": [
        {"first_name": "Farida",  "last_name": "Mostafa",  "email": "farida.mostafa@cairotech.eg",  "mobile": "+20 10 4567 8901", "title": "HR Specialist",         "hire_date": date(2020, 6, 10)},
        {"first_name": "Mariam",  "last_name": "Adel",     "email": "mariam.adel@cairotech.eg",     "mobile": "+20 11 5678 9012", "title": "Recruiter",             "hire_date": date(2022, 11, 5)},
    ],
    "Finance": [
        {"first_name": "Ahmed",   "last_name": "Nabil",    "email": "ahmed.nabil@cairotech.eg",     "mobile": "+20 12 6789 0123", "title": "Financial Analyst",     "hire_date": date(2019, 4, 22)},
        {"first_name": "Salma",   "last_name": "Ibrahim",  "email": "salma.ibrahim@cairotech.eg",   "mobile": "+20 15 7890 1234", "title": "Accountant",            "hire_date": date(2021, 9, 8)},
    ],
    "Operations": [
        {"first_name": "Karim",   "last_name": "Fawzy",    "email": "karim.fawzy@alextrade.eg",     "mobile": "+20 10 8901 2345", "title": "Operations Manager",    "hire_date": date(2018, 2, 14)},
        {"first_name": "Dina",    "last_name": "Mahmoud",  "email": "dina.mahmoud@alextrade.eg",    "mobile": "+20 11 9012 3456", "title": "Logistics Coordinator", "hire_date": date(2023, 5, 30)},
    ],
    "Marketing": [
        {"first_name": "Layla",   "last_name": "Samir",    "email": "layla.samir@alextrade.eg",     "mobile": "+20 12 0123 4567", "title": "Marketing Lead",        "hire_date": date(2020, 8, 17)},
        {"first_name": "Hossam",  "last_name": "El-Din",   "email": "hossam.eldin@alextrade.eg",   "mobile": "+20 10 1234 7890", "title": "Content Strategist",    "hire_date": date(2022, 3, 3)},
    ],
    "Legal": [
        {"first_name": "Sherine", "last_name": "Farouk",   "email": "sherine.farouk@alextrade.eg",  "mobile": "+20 11 2345 8901", "title": "Corporate Counsel",     "hire_date": date(2017, 10, 1)},
    ],
}

# Non-employee users (admin + one HR manager per company)
ADMIN_USERS = [
    {
        "email": "admin@pyhr.dev",
        "password": "admin1234",
        "role": UserRole.SYSTEM_ADMIN,
        "company": None,
    },
]

HR_USERS: list[dict] = [
    {"email": "hr@cairotech.eg",  "password": "hr1234", "company": "CairoTech"},
    {"email": "hr@alextrade.eg",  "password": "hr1234", "company": "AlexTrade"},
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _hash(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def _get_or_create_company(db: Session, name: str) -> Company:
    obj = db.query(Company).filter_by(name=name).first()
    if not obj:
        obj = Company(name=name)
        db.add(obj)
        db.flush()
        print(f"  + Company: {name}")
    return obj


def _get_or_create_department(db: Session, name: str, company: Company) -> Department:
    obj = (
        db.query(Department)
        .filter_by(name=name, company_id=company.id)
        .first()
    )
    if not obj:
        obj = Department(name=name, company=company)
        db.add(obj)
        db.flush()
        print(f"    + Department: {name} ({company.name})")
    return obj


def _get_or_create_employee(db: Session, data: dict, department: Department, company: Company) -> Employee:
    obj = db.query(Employee).filter_by(email=data["email"]).first()
    if not obj:
        obj = Employee(
            **data,
            status=EmployeeStatus.ACTIVE,
            department=department,
            company=company,
        )
        db.add(obj)
        db.flush()
        print(f"      + Employee: {data['first_name']} {data['last_name']} <{data['email']}>")

        # Auto-provision user account
        user = User(
            email=data["email"],
            password_hash=_hash("employee1234"),
            role=UserRole.EMPLOYEE,
            employee=obj,
            company=company,
        )
        db.add(user)
        print(f"        + User (employee): {data['email']}")
    return obj


def _get_or_create_user(db: Session, email: str, password: str, role: UserRole, company: Company | None) -> User:
    obj = db.query(User).filter_by(email=email).first()
    if not obj:
        obj = User(
            email=email,
            password_hash=_hash(password),
            role=role,
            company=company,
        )
        db.add(obj)
        print(f"  + User ({role.value}): {email}")
    return obj


# ---------------------------------------------------------------------------
# Reset
# ---------------------------------------------------------------------------

def reset(db: Session) -> None:
    print("Resetting tables …")
    for model in (User, Employee, Department, Company):
        count = db.query(model).delete()
        print(f"  Deleted {count} row(s) from {model.__tablename__}")
    db.commit()


# ---------------------------------------------------------------------------
# Main seed
# ---------------------------------------------------------------------------

def seed(db: Session) -> None:
    print("\n── Companies & Departments ──")
    company_map: dict[str, Company] = {}
    dept_map: dict[str, Department] = {}

    for c_data in COMPANIES:
        company = _get_or_create_company(db, c_data["name"])
        company_map[c_data["name"]] = company

        for dept_name in DEPARTMENTS[c_data["name"]]:
            dept = _get_or_create_department(db, dept_name, company)
            dept_map[dept_name] = dept

    print("\n── Employees & Employee Accounts ──")
    for dept_name, employees in EMPLOYEES.items():
        dept = dept_map[dept_name]
        for emp_data in employees:
            _get_or_create_employee(db, emp_data, dept, dept.company)

    print("\n── Admin & HR Users ──")
    for u in ADMIN_USERS:
        _get_or_create_user(db, u["email"], u["password"], u["role"], company=None)

    for u in HR_USERS:
        company = company_map[u["company"]]
        _get_or_create_user(db, u["email"], u["password"], UserRole.HR_MANAGER, company)

    db.commit()
    print("\nSeed complete.")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the pyhr database.")
    parser.add_argument("--reset", action="store_true", help="Wipe all rows before seeding.")
    args = parser.parse_args()

    print("Creating schema …")
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        if args.reset:
            reset(db)
        seed(db)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"\nError: {exc}", file=sys.stderr)
        sys.exit(1)
