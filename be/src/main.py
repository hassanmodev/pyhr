from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.routers import auth, companies, departments, employees


@asynccontextmanager
async def lifespan(app: FastAPI):
    from src.database import engine
    from src.models import Base
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    lifespan=lifespan,
    title="pyhr API",
    description="""
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
""",
    version="1.0.0",
    openapi_tags=[
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
            "Creating an employee automatically provisions a User account. "
            "Each response includes auto-calculated `days_employed`.",
        },
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(companies.router)
app.include_router(departments.router)
app.include_router(employees.router)


@app.get("/health", tags=["health"], summary="Health check")
def health():
    return {"status": "ok"}
