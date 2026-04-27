"""Tests for departments router - focused on response structures and permissions."""

from conftest import auth_headers


class TestListDepartments:
    def test_admin_lists_all_departments(self, client, admin_token, sample_department):
        """Admin sees all departments with counts."""
        response = client.get("/departments/", headers=auth_headers(admin_token))
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Check response structure
        if data:
            dept = data[0]
            assert "id" in dept
            assert "name" in dept
            assert "company_id" in dept
            assert "active_employee_count" in dept
            assert "created_at" in dept
            assert isinstance(dept["active_employee_count"], int)

    def test_admin_can_filter_by_company(self, client, admin_token, sample_company, sample_department):
        """Admin can filter departments by company_id."""
        response = client.get(
            f"/departments/?company_id={sample_company.id}",
            headers=auth_headers(admin_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        for dept in data:
            assert dept["company_id"] == sample_company.id


class TestCreateDepartment:
    def test_admin_can_create(self, client, admin_token, sample_company):
        """Admin can create a department."""
        response = client.post(
            "/departments/",
            headers=auth_headers(admin_token),
            json={"name": "New Department", "company_id": sample_company.id},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "New Department"
        assert data["company_id"] == sample_company.id
        assert "id" in data
        assert data["active_employee_count"] == 0

    def test_hr_can_create_in_own_company(self, client, hr_token, sample_company):
        """HR manager can create department in their company."""
        response = client.post(
            "/departments/",
            headers=auth_headers(hr_token),
            json={"name": "HR Department", "company_id": sample_company.id},
        )
        assert response.status_code == 201

    def test_create_department_wrong_company_fails(self, client, admin_token):
        """Creating department for non-existent company returns 404."""
        response = client.post(
            "/departments/",
            headers=auth_headers(admin_token),
            json={"name": "Orphan Dept", "company_id": 99999},
        )
        assert response.status_code == 404

    def test_duplicate_name_in_company_fails(self, client, admin_token, sample_company, sample_department):
        """Creating department with duplicate name in same company returns 409."""
        response = client.post(
            "/departments/",
            headers=auth_headers(admin_token),
            json={"name": sample_department.name, "company_id": sample_company.id},
        )
        assert response.status_code == 409


class TestGetDepartment:
    def test_admin_can_get_any_department(self, client, admin_token, sample_department):
        """Admin can get any department."""
        response = client.get(
            f"/departments/{sample_department.id}",
            headers=auth_headers(admin_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_department.id
        assert data["name"] == sample_department.name
        assert "active_employee_count" in data

    def test_hr_can_get_own_company_department(self, client, hr_token, sample_department):
        """HR manager can get their company's department."""
        response = client.get(
            f"/departments/{sample_department.id}",
            headers=auth_headers(hr_token),
        )
        assert response.status_code == 200


class TestUpdateDepartment:
    def test_admin_can_update(self, client, admin_token, sample_department):
        """Admin can update department name."""
        response = client.patch(
            f"/departments/{sample_department.id}",
            headers=auth_headers(admin_token),
            json={"name": "Updated Department"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Department"

class TestDeleteDepartment:
    def test_admin_can_delete(self, client, admin_token, sample_company):
        """Admin can delete a department."""
        # Create a department first
        resp = client.post(
            "/departments/",
            headers=auth_headers(admin_token),
            json={"name": "To Delete", "company_id": sample_company.id},
        )
        dept_id = resp.json()["id"]

        response = client.delete(
            f"/departments/{dept_id}",
            headers=auth_headers(admin_token),
        )
        assert response.status_code == 204
