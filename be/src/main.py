from flask import Flask, jsonify
from flask_cors import CORS
from flasgger import Swagger

from src.database import engine
from src.models import Base
from src.routers import auth, companies, departments, employees

API_DESCRIPTION = """
## Employee Management System API

A RESTful API for managing companies, departments, and employees with role-based access control.

### Roles & Permissions

| Resource | System Admin | HR Manager | Employee |
|---|---|---|---|
| Companies | Full CRUD | Read only | — |
| Departments | Full CRUD | Full CRUD (own company) | Read own dept |
| Employees | Full CRUD | Full CRUD (own company) | Read own profile |

### Authentication

All endpoints (except `/auth/login`) require a Bearer JWT token.

```
Authorization: Bearer <token>
```

Obtain a token via **POST /auth/login**.
"""

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
            "description": "Login and retrieve the current authenticated user.",
        },
        {
            "name": "companies",
            "description": "Company CRUD — **System Admin only**. "
            "Includes pre-computed department and employee totals.",
        },
        {
            "name": "departments",
            "description": "Department CRUD — **System Admin** (all companies) or "
            "**HR Manager** (own company only). "
            "Each response includes the current active-employee count.",
        },
        {
            "name": "employees",
            "description": "Employee CRUD — **System Admin** (all companies) or "
            "**HR Manager** (own company only). "
            "Each person is one `employees` row (profile + login credentials). "
            "Each response includes auto-calculated `days_employed`.",
        },
        {
            "name": "health",
            "description": "Service health check.",
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
        """Health check
        ---
        tags:
          - health
        summary: Health check
        responses:
          200:
            description: OK
            schema:
              type: object
              properties:
                status:
                  type: string
                  example: ok
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
