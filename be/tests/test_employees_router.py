"""Tests for employees router - focused on response structures and permissions."""

from conftest import auth_headers


class TestGetMyProfile:
    def test_employee_can_get_own_profile(self, client, employee_token, employee_user):
        """Employee can get their own profile with computed fields."""
        response = client.get("/employees/me", headers=auth_headers(employee_token))
        assert response.status_code == 200
        data = response.json()
        # Check response structure
        assert data["id"] == employee_user.id
        assert data["email"] == employee_user.email
        assert "full_name" in data
        assert "days_employed" in data
        assert "company_name" in data
        assert isinstance(data["days_employed"], int)
        assert data["full_name"] == f"{employee_user.first_name} {employee_user.last_name}"


class TestListEmployees:
    def test_admin_lists_all_employees(self, client, admin_token, employee_user):
        """Admin sees all employees."""
        response = client.get("/employees/", headers=auth_headers(admin_token))
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        # Check response structure
        emp = data[0]
        assert "id" in emp
        assert "first_name" in emp
        assert "last_name" in emp
        assert "full_name" in emp
        assert "email" in emp
        assert "days_employed" in emp

    def test_hr_sees_own_company_employees(self, client, hr_token, employee_user):
        """HR manager sees only their company's employees."""
        response = client.get("/employees/", headers=auth_headers(hr_token))
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All returned employees should belong to HR's company
        for emp in data:
            assert emp["company_id"] == employee_user.company_id


class TestCreateEmployee:
    def test_admin_can_create_employee(self, client, admin_token, sample_company, sample_department):
        """Admin can create employee and gets proper response."""
        response = client.post(
            "/employees/",
            headers=auth_headers(admin_token),
            json={
                "first_name": "Jane",
                "last_name": "Smith",
                "email": "jane@test.com",
                "mobile": "+1234567890",
                "title": "Developer",
                "hire_date": "2023-01-01",
                "company_id": sample_company.id,
                "department_id": sample_department.id,
                "password": "password123",
                "role": "employee",
            },
        )
        assert response.status_code == 201
        data = response.json()
        assert data["first_name"] == "Jane"
        assert data["last_name"] == "Smith"
        assert data["email"] == "jane@test.com"
        assert "full_name" in data
        assert "days_employed" in data
        assert data["company_id"] == sample_company.id

    def test_duplicate_email_fails(self, client, admin_token, sample_company, employee_user):
        """Creating employee with duplicate email returns 409."""
        response = client.post(
            "/employees/",
            headers=auth_headers(admin_token),
            json={
                "first_name": "Duplicate",
                "last_name": "User",
                "email": employee_user.email,  # Existing email
                "mobile": "+9998887777",
                "title": "Tester",
                "hire_date": "2023-01-01",
                "company_id": sample_company.id,
                "password": "password123",
                "role": "employee",
            },
        )
        assert response.status_code == 409

    def test_hr_cannot_create_admin(self, client, hr_token, sample_company):
        """HR manager cannot create admin users."""
        response = client.post(
            "/employees/",
            headers=auth_headers(hr_token),
            json={
                "first_name": "Bad",
                "last_name": "Admin",
                "email": "badadmin@test.com",
                "mobile": "+1112223333",
                "title": "Hacker",
                "hire_date": "2023-01-01",
                "company_id": sample_company.id,
                "password": "password123",
                "role": "system_admin",  # HR cannot assign this
            },
        )
        assert response.status_code == 403


class TestGetEmployee:
    def test_admin_can_get_any_employee(self, client, admin_token, employee_user):
        """Admin can get any employee."""
        response = client.get(
            f"/employees/{employee_user.id}",
            headers=auth_headers(admin_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == employee_user.id
        assert data["email"] == employee_user.email

    def test_not_found_returns_404(self, client, admin_token):
        """Getting non-existent employee returns 404."""
        response = client.get(
            "/employees/99999",
            headers=auth_headers(admin_token),
        )
        assert response.status_code == 404


class TestUpdateEmployee:
    def test_admin_can_update_employee(self, client, admin_token, employee_user):
        """Admin can update employee."""
        response = client.patch(
            f"/employees/{employee_user.id}",
            headers=auth_headers(admin_token),
            json={"first_name": "Updated Name"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["first_name"] == "Updated Name"
        assert data["full_name"] == "Updated Name Doe"

    def test_update_email_duplicate_fails(self, client, admin_token, employee_user, hr_user):
        """Updating to duplicate email returns 409."""
        response = client.patch(
            f"/employees/{employee_user.id}",
            headers=auth_headers(admin_token),
            json={"email": hr_user.email},  # HR user's email
        )
        assert response.status_code == 409


class TestDeleteEmployee:
    def test_admin_can_delete_employee(self, client, admin_token, sample_company, sample_department):
        """Admin can delete an employee."""
        # Create an employee first
        resp = client.post(
            "/employees/",
            headers=auth_headers(admin_token),
            json={
                "first_name": "To",
                "last_name": "Delete",
                "email": "todelete@test.com",
                "mobile": "+9998887777",
                "title": "Temp",
                "hire_date": "2023-01-01",
                "company_id": sample_company.id,
                "department_id": sample_department.id,
                "password": "password123",
                "role": "employee",
            },
        )
        emp_id = resp.json()["id"]

        response = client.delete(
            f"/employees/{emp_id}",
            headers=auth_headers(admin_token),
        )
        assert response.status_code == 204
