"""Pytest fixtures and configuration for Flask."""

import os
from datetime import date

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Set test environment variables before importing app modules
os.environ["JWT_SECRET"] = "test_secret_key"
os.environ["JWT_EXPIRE_MINUTES"] = "60"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

# Import and monkey-patch the database before importing the app
from src import database
from src.models import Base
from src.models.company import Company
from src.models.department import Department
from src.models.employee import Employee, EmployeeStatus
from src.models.user import UserRole
from src.core.security import hash_password

# Create in-memory SQLite database for testing
_test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
_test_session_local = sessionmaker(autocommit=False, autoflush=False, bind=_test_engine)

# Monkey-patch the database module
database.engine = _test_engine
database.SessionLocal = _test_session_local

# Now we can import the app
from src.main import create_app


@pytest.fixture(scope="function")
def db():
    """Create a fresh database session for each test."""
    Base.metadata.create_all(bind=_test_engine)
    session = _test_session_local()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=_test_engine)


@pytest.fixture(scope="function")
def app(db):
    """Create a Flask app with test configuration."""
    flask_app = create_app()
    flask_app.config["TESTING"] = True
    yield flask_app


@pytest.fixture(scope="function")
def client(app, db):
    """Create a test client."""
    # Store db in app context for access during tests
    app.test_db = db
    with app.test_client() as test_client:
        yield test_client


@pytest.fixture
def sample_company(db):
    """Create a sample company."""
    company = Company(name="Test Company")
    db.add(company)
    db.commit()
    db.refresh(company)
    return company


@pytest.fixture
def sample_department(db, sample_company):
    """Create a sample department."""
    department = Department(name="Test Department", company_id=sample_company.id)
    db.add(department)
    db.commit()
    db.refresh(department)
    return department


@pytest.fixture
def admin_user(db):
    """Create an admin user."""
    employee = Employee(
        first_name="Admin",
        last_name="User",
        email="admin@test.com",
        mobile="+1234567890",
        title="System Administrator",
        hire_date=date(2020, 1, 1),
        status=EmployeeStatus.ACTIVE,
        password_hash=hash_password("admin1234"),
        role=UserRole.SYSTEM_ADMIN,
        is_active=True,
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee


@pytest.fixture
def hr_user(db, sample_company, sample_department):
    """Create an HR manager user."""
    employee = Employee(
        first_name="HR",
        last_name="Manager",
        email="hr@test.com",
        mobile="+1987654321",
        title="HR Manager",
        hire_date=date(2021, 1, 1),
        status=EmployeeStatus.ACTIVE,
        company_id=sample_company.id,
        department_id=sample_department.id,
        password_hash=hash_password("hr1234"),
        role=UserRole.HR_MANAGER,
        is_active=True,
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee


@pytest.fixture
def employee_user(db, sample_company, sample_department):
    """Create a regular employee user."""
    employee = Employee(
        first_name="John",
        last_name="Doe",
        email="john@test.com",
        mobile="+1122334455",
        title="Software Engineer",
        hire_date=date(2022, 1, 1),
        status=EmployeeStatus.ACTIVE,
        company_id=sample_company.id,
        department_id=sample_department.id,
        password_hash=hash_password("employee1234"),
        role=UserRole.EMPLOYEE,
        is_active=True,
    )
    db.add(employee)
    db.commit()
    db.refresh(employee)
    return employee


@pytest.fixture
def admin_token(admin_user, client):
    """Get access token for admin user."""
    response = client.post(
        "/auth/login",
        json={"email": "admin@test.com", "password": "admin1234"},
    )
    assert response.status_code == 200, f"Admin login failed: {response.get_json()}"
    return response.get_json()["access_token"]


@pytest.fixture
def hr_token(hr_user, client):
    """Get access token for HR manager."""
    response = client.post(
        "/auth/login",
        json={"email": "hr@test.com", "password": "hr1234"},
    )
    assert response.status_code == 200, f"HR login failed: {response.get_json()}"
    return response.get_json()["access_token"]


@pytest.fixture
def employee_token(employee_user, client):
    """Get access token for regular employee."""
    response = client.post(
        "/auth/login",
        json={"email": "john@test.com", "password": "employee1234"},
    )
    assert response.status_code == 200, f"Employee login failed: {response.get_json()}"
    return response.get_json()["access_token"]


def auth_headers(token: str) -> dict:
    """Helper to create authorization headers."""
    return {"Authorization": f"Bearer {token}"}
