"""Tests for companies router - focused on response structures and permissions."""

from conftest import auth_headers


class TestListCompanies:
    def test_admin_lists_all_companies(self, client, admin_token, sample_company):
        """Admin sees all companies with counts."""
        response = client.get("/companies/", headers=auth_headers(admin_token))
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        # Check response structure
        company = data[0]
        assert "id" in company
        assert "name" in company
        assert "total_departments" in company
        assert "total_employees" in company
        assert "created_at" in company
        assert isinstance(company["total_departments"], int)
        assert isinstance(company["total_employees"], int)

    def test_hr_sees_own_company_only(self, client, hr_token, sample_company):
        """HR manager sees only their assigned company."""
        response = client.get("/companies/", headers=auth_headers(hr_token))
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["name"] == sample_company.name

    def test_employee_cannot_list(self, client, employee_token):
        """Regular employee cannot list companies."""
        response = client.get("/companies/", headers=auth_headers(employee_token))
        assert response.status_code == 403


class TestCreateCompany:
    def test_admin_can_create(self, client, admin_token):
        """Admin can create a company and gets proper response."""
        response = client.post(
            "/companies/",
            headers=auth_headers(admin_token),
            json={"name": "New Company"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "New Company"
        assert "id" in data
        assert data["total_departments"] == 0
        assert data["total_employees"] == 0

    def test_hr_cannot_create(self, client, hr_token):
        """HR manager cannot create companies."""
        response = client.post(
            "/companies/",
            headers=auth_headers(hr_token),
            json={"name": "HR Company"},
        )
        assert response.status_code == 403

    def test_duplicate_name_fails(self, client, admin_token, sample_company):
        """Creating company with duplicate name returns 409."""
        response = client.post(
            "/companies/",
            headers=auth_headers(admin_token),
            json={"name": sample_company.name},
        )
        assert response.status_code == 409


class TestGetCompany:
    def test_admin_can_get_company(self, client, admin_token, sample_company):
        """Admin can get single company with counts."""
        response = client.get(
            f"/companies/{sample_company.id}",
            headers=auth_headers(admin_token),
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == sample_company.id
        assert data["name"] == sample_company.name
        assert "total_departments" in data
        assert "total_employees" in data

    def test_not_found_returns_404(self, client, admin_token):
        """Getting non-existent company returns 404."""
        response = client.get(
            "/companies/99999",
            headers=auth_headers(admin_token),
        )
        assert response.status_code == 404


class TestUpdateCompany:
    def test_admin_can_update(self, client, admin_token, sample_company):
        """Admin can update company name."""
        response = client.patch(
            f"/companies/{sample_company.id}",
            headers=auth_headers(admin_token),
            json={"name": "Updated Name"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Name"
        assert data["id"] == sample_company.id

    def test_update_duplicate_name_fails(self, client, admin_token, sample_company):
        """Updating to duplicate name returns 409."""
        # Create another company first
        resp = client.post(
            "/companies/",
            headers=auth_headers(admin_token),
            json={"name": "Another Company"},
        )
        another_id = resp.json()["id"]

        # Try to update to existing name
        response = client.patch(
            f"/companies/{another_id}",
            headers=auth_headers(admin_token),
            json={"name": sample_company.name},
        )
        assert response.status_code == 409


class TestDeleteCompany:
    def test_admin_can_delete_empty_company(self, client, admin_token):
        """Admin can delete company with no employees."""
        # Create a company first
        resp = client.post(
            "/companies/",
            headers=auth_headers(admin_token),
            json={"name": "To Delete"},
        )
        company_id = resp.json()["id"]

        response = client.delete(
            f"/companies/{company_id}",
            headers=auth_headers(admin_token),
        )
        assert response.status_code == 204
