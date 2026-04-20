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
from src.models import Base, Company, Department, Employee, EmployeeStatus, UserRole

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

ADMIN_USER = {
    "email": "admin@pyhr.dev",
    "password": "admin1234",
    "first_name": "System",
    "last_name": "Administrator",
    "mobile": "+0 000 000 0000",
    "title": "System Administrator",
    "hire_date": date(2020, 1, 1),
    "role": UserRole.SYSTEM_ADMIN,
}

HR_USERS: list[dict] = [
    {
        "email": "hr@cairotech.eg",
        "password": "hr1234",
        "company": "CairoTech",
        "dept": "Human Resources",
        "first_name": "HR",
        "last_name": "Manager",
        "mobile": "+20 10 1111 2222",
        "title": "HR Manager",
        "hire_date": date(2019, 1, 1),
    },
    {
        "email": "hr@alextrade.eg",
        "password": "hr1234",
        "company": "AlexTrade",
        "dept": "Operations",
        "first_name": "HR",
        "last_name": "Manager",
        "mobile": "+20 10 2222 3333",
        "title": "HR Manager",
        "hire_date": date(2019, 2, 1),
    },
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


def _get_or_create_employee(
    db: Session,
    data: dict,
    department: Department,
    company: Company,
    *,
    password: str,
    role: UserRole,
) -> Employee:
    obj = db.query(Employee).filter_by(email=data["email"]).first()
    if not obj:
        obj = Employee(
            first_name=data["first_name"],
            last_name=data["last_name"],
            email=data["email"],
            mobile=data["mobile"],
            title=data["title"],
            hire_date=data["hire_date"],
            status=EmployeeStatus.ACTIVE,
            department=department,
            company=company,
            password_hash=_hash(password),
            role=role,
            is_active=True,
        )
        db.add(obj)
        db.flush()
        print(f"      + Employee ({role.value}): {data['first_name']} {data['last_name']} <{data['email']}>")
    return obj


def _get_or_create_admin(db: Session, u: dict) -> Employee:
    obj = db.query(Employee).filter_by(email=u["email"]).first()
    if not obj:
        obj = Employee(
            first_name=u["first_name"],
            last_name=u["last_name"],
            email=u["email"],
            mobile=u["mobile"],
            title=u["title"],
            hire_date=u["hire_date"],
            status=EmployeeStatus.ACTIVE,
            department_id=None,
            company_id=None,
            password_hash=_hash(u["password"]),
            role=u["role"],
            is_active=True,
        )
        db.add(obj)
        print(f"  + System admin: {u['email']}")
    return obj


# ---------------------------------------------------------------------------
# Reset
# ---------------------------------------------------------------------------

def reset(db: Session) -> None:
    print("Resetting tables …")
    for model in (Employee, Department, Company):
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

    print("\n── Employees ──")
    for dept_name, employees in EMPLOYEES.items():
        dept = dept_map[dept_name]
        for emp_data in employees:
            _get_or_create_employee(db, emp_data, dept, dept.company, password="employee1234", role=UserRole.EMPLOYEE)

    print("\n── Admin & HR ──")
    _get_or_create_admin(db, ADMIN_USER)

    for u in HR_USERS:
        company = company_map[u["company"]]
        dept = dept_map[u["dept"]]
        _get_or_create_employee(
            db,
            {
                "first_name": u["first_name"],
                "last_name": u["last_name"],
                "email": u["email"],
                "mobile": u["mobile"],
                "title": u["title"],
                "hire_date": u["hire_date"],
            },
            dept,
            company,
            password=u["password"],
            role=UserRole.HR_MANAGER,
        )

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
