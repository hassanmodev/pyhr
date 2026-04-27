from flask import Flask, jsonify
from flask_cors import CORS
from flasgger import Swagger

from src.database import engine
from src.models import Base
from src.routers import auth, companies, departments, employees

API_DESCRIPTION = """
## pyhr API

JSON REST API for companies, departments, and employees. Each **employee** row holds HR profile fields plus **login** credentials (`password_hash`, `role`); there is no separate users table.

### Authentication

Every request except **`POST /auth/login`** and **`GET /health`** must send:

```
Authorization: Bearer <access_token>
```

The JWT **subject** (`sub`) is the employee **integer id**. Tokens embed `role` and `company_id` for authorization.

### Errors

Errors return JSON **`{"detail": "message"}`** with status **400**, **401**, **403**, **404**, **409**, or **422** (see global handlers in `main.py`).

### Roles (summary)

| Resource | System admin | HR manager | Employee |
|----------|--------------|------------|----------|
| Companies | Full CRUD | `GET /companies/` (own company only) | — |
| Departments | Full CRUD in any company | CRUD for own `company_id` | `GET /departments/{id}` only if `id` is their department |
| Employees | Full CRUD | CRUD for own company | `GET /employees/me` only |

### Response models

Reusable schemas are under **Definitions** below (`CompanyOut`, `DepartmentOut`, `EmployeeOut`, etc.). List endpoints return arrays of those objects.
"""

# Shared Swagger 2.0 models (referenced from route docstrings as '#/definitions/...')
SWAGGER_DEFINITIONS = {
    "ApiError": {
        "type": "object",
        "required": ["detail"],
        "properties": {
            "detail": {
                "type": "string",
                "description": "Error message from the API",
            },
        },
    },
    "CompanyOut": {
        "type": "object",
        "required": ["id", "name", "total_departments", "total_employees"],
        "properties": {
            "id": {"type": "integer", "format": "int64"},
            "name": {"type": "string"},
            "total_departments": {
                "type": "integer",
                "description": "Count of departments for this company",
            },
            "total_employees": {
                "type": "integer",
                "description": "Count of employees with status **active** for this company",
            },
            "created_at": {
                "type": "string",
                "format": "date-time",
                "x-nullable": True,
                "description": "ISO 8601 timestamp",
            },
        },
    },
    "DepartmentOut": {
        "type": "object",
        "required": ["id", "name", "company_id", "active_employee_count"],
        "properties": {
            "id": {"type": "integer", "format": "int64"},
            "name": {"type": "string"},
            "company_id": {"type": "integer", "format": "int64"},
            "active_employee_count": {
                "type": "integer",
                "description": "Employees in this department with employment status **active**",
            },
            "created_at": {
                "type": "string",
                "format": "date-time",
                "x-nullable": True,
            },
        },
    },
    "EmployeeOut": {
        "type": "object",
        "required": [
            "id",
            "first_name",
            "last_name",
            "full_name",
            "email",
            "mobile",
            "title",
            "hire_date",
            "status",
            "days_employed",
            "role",
        ],
        "properties": {
            "id": {"type": "integer", "format": "int64"},
            "first_name": {"type": "string"},
            "last_name": {"type": "string"},
            "full_name": {"type": "string"},
            "email": {"type": "string", "format": "email"},
            "mobile": {"type": "string"},
            "address": {"type": "string", "x-nullable": True},
            "title": {"type": "string", "description": "Job title"},
            "hire_date": {"type": "string", "format": "date", "description": "ISO date YYYY-MM-DD"},
            "status": {"type": "string", "enum": ["active", "inactive"]},
            "department_id": {"type": "integer", "format": "int64", "x-nullable": True},
            "department_name": {"type": "string", "x-nullable": True},
            "company_id": {"type": "integer", "format": "int64", "x-nullable": True},
            "company_name": {"type": "string"},
            "days_employed": {
                "type": "integer",
                "description": "Whole days since hire_date (not stored in DB)",
            },
            "created_at": {"type": "string", "format": "date-time", "x-nullable": True},
            "role": {"type": "string", "enum": ["system_admin", "hr_manager", "employee"]},
        },
    },
    "LoginRequest": {
        "type": "object",
        "required": ["email", "password"],
        "properties": {
            "email": {"type": "string", "format": "email"},
            "password": {"type": "string", "format": "password"},
        },
    },
    "TokenResponse": {
        "type": "object",
        "required": ["access_token", "token_type"],
        "properties": {
            "access_token": {"type": "string", "description": "JWT access token"},
            "token_type": {"type": "string", "example": "bearer"},
        },
    },
    "AuthMeOut": {
        "type": "object",
        "required": ["id", "email", "role", "company_id", "is_active"],
        "properties": {
            "id": {"type": "integer", "format": "int64"},
            "email": {"type": "string", "format": "email"},
            "role": {"type": "string", "enum": ["system_admin", "hr_manager", "employee"]},
            "company_id": {"type": "integer", "format": "int64", "x-nullable": True},
            "is_active": {"type": "boolean"},
        },
    },
    "CompanyCreate": {
        "type": "object",
        "required": ["name"],
        "properties": {
            "name": {"type": "string", "description": "Unique company name"},
        },
    },
    "CompanyPatch": {
        "type": "object",
        "properties": {
            "name": {"type": "string"},
        },
    },
    "DepartmentCreate": {
        "type": "object",
        "required": ["name", "company_id"],
        "properties": {
            "name": {"type": "string"},
            "company_id": {"type": "integer", "format": "int64"},
        },
    },
    "DepartmentPatch": {
        "type": "object",
        "properties": {
            "name": {"type": "string"},
        },
    },
    "EmployeeCreate": {
        "type": "object",
        "required": [
            "first_name",
            "last_name",
            "email",
            "mobile",
            "title",
            "hire_date",
            "company_id",
            "password",
        ],
        "properties": {
            "first_name": {"type": "string"},
            "last_name": {"type": "string"},
            "email": {"type": "string", "format": "email"},
            "mobile": {"type": "string"},
            "address": {"type": "string", "description": "Optional"},
            "title": {"type": "string"},
            "hire_date": {"type": "string", "format": "date"},
            "status": {"type": "string", "enum": ["active", "inactive"], "default": "active"},
            "department_id": {"type": "integer", "format": "int64", "x-nullable": True},
            "company_id": {"type": "integer", "format": "int64"},
            "password": {"type": "string", "format": "password"},
            "role": {
                "type": "string",
                "enum": ["system_admin", "hr_manager", "employee"],
                "default": "employee",
                "description": "Creating system_admin sets company_id null; scope rules apply",
            },
        },
    },
    "HealthOut": {
        "type": "object",
        "required": ["status"],
        "properties": {
            "status": {"type": "string", "example": "ok"},
        },
    },
    "EmployeePatch": {
        "type": "object",
        "properties": {
            "first_name": {"type": "string"},
            "last_name": {"type": "string"},
            "email": {"type": "string", "format": "email"},
            "mobile": {"type": "string"},
            "address": {"type": "string", "x-nullable": True},
            "title": {"type": "string"},
            "hire_date": {"type": "string", "format": "date"},
            "status": {"type": "string", "enum": ["active", "inactive"]},
            "department_id": {"type": "integer", "format": "int64", "x-nullable": True},
            "company_id": {"type": "integer", "format": "int64", "x-nullable": True},
            "role": {"type": "string", "enum": ["system_admin", "hr_manager", "employee"]},
        },
    },
}

SWAGGER_TEMPLATE = {
    "swagger": "2.0",
    "info": {
        "title": "pyhr API",
        "description": API_DESCRIPTION,
        "version": "1.0.0",
    },
    "tags": [
        {
            "name": "auth",
            "description": "Obtain JWT and inspect the authenticated principal (`/auth/me`).",
        },
        {
            "name": "companies",
            "description": "**GET** `/companies/`: system admin (all) or HR manager (own company). "
            "**POST/PATCH/DELETE** and **GET /{id}**: system admin only. "
            "Totals count **active** employees only.",
        },
        {
            "name": "departments",
            "description": "List/create/update/delete: system admin or HR (own company). "
            "**GET /{id}**: also employees, but only for their own `department_id`.",
        },
        {
            "name": "employees",
            "description": "**GET /me**: any authenticated role (full `EmployeeOut`). "
            "List/detail/create/update/delete: system admin or HR manager (company scope).",
        },
        {
            "name": "health",
            "description": "Liveness probe; no authentication.",
        },
    ],
    "securityDefinitions": {
        "Bearer": {
            "type": "apiKey",
            "name": "Authorization",
            "in": "header",
            "description": "JWT access token: `Bearer <token>`",
        }
    },
    "definitions": SWAGGER_DEFINITIONS,
}


def create_app() -> Flask:
    app = Flask(__name__)

    CORS(app, origins=["http://localhost:3000", "http://localhost:5173"], supports_credentials=True)

    Swagger(app, template=SWAGGER_TEMPLATE, merge=True)

    with app.app_context():
        Base.metadata.create_all(bind=engine)

    app.register_blueprint(auth.bp, url_prefix="/auth")
    app.register_blueprint(companies.bp, url_prefix="/companies")
    app.register_blueprint(departments.bp, url_prefix="/departments")
    app.register_blueprint(employees.bp, url_prefix="/employees")

    @app.route("/health", methods=["GET"])
    def health():
        """Liveness probe for load balancers; **no authentication**.
        ---
        tags:
          - health
        summary: Health check
        produces:
          - application/json
        responses:
          200:
            description: Service is up
            schema:
              $ref: '#/definitions/HealthOut'
        """
        return jsonify({"status": "ok"})

    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({"detail": str(error.description)}), 400

    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify({"detail": str(error.description)}), 401

    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({"detail": str(error.description)}), 403

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"detail": str(error.description)}), 404

    @app.errorhandler(409)
    def conflict(error):
        return jsonify({"detail": str(error.description)}), 409

    @app.errorhandler(422)
    def unprocessable(error):
        return jsonify({"detail": str(error.description)}), 422

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8005, debug=True)
