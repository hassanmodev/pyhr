# Database

PostgreSQL backs the API via **SQLAlchemy 2** and the **psycopg** driver. ORM models live under `be/src/models/`.

## Configuration

`be/src/database.py` loads the repo root `.env` (three parents up from that file).

| Source | Use |
|--------|-----|
| `DATABASE_URL` | If set, used as-is (e.g. `postgresql+psycopg://user:pass@host:5432/db` in Docker). |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Built into a URL when `DATABASE_URL` is unset. |
| `POSTGRES_HOST`, `POSTGRES_PORT` | Optional; default `localhost` / `5432`. |

Passwords in the URL are passed through `urllib.parse.quote_plus` so special characters are safe.

The engine uses `pool_pre_ping=True` so stale connections are detected before use.

## Schema lifecycle

| Step | What happens |
|------|----------------|
| API startup | `Base.metadata.create_all(bind=engine)` runs in the FastAPI lifespan (`be/src/main.py`). Creates missing tables; **does not** alter or drop existing columns. |
| Seed | `python -m src.seed` from `be/` (or `docker compose exec api python -m src.seed`). Ensures tables exist, then inserts demo data idempotently. |
| Wipe data | `python -m src.seed --reset` deletes all rows in `employees`, `departments`, `companies` (in that order), then re-seeds. Schema objects remain. |

There are **no Alembic migrations** in this project; treat schema changes as developer-led (recreate DB or migrate manually in production).

## Tables

All tables use integer **primary keys** and, via `TimestampMixin`, **`created_at`** and **`updated_at`** (`server_default` / `onupdate` with `func.now()`).

### `companies`

| Column | Notes |
|--------|--------|
| `id` | PK |
| `name` | `VARCHAR(255)`, unique, not null |

Relationship: one company has many `departments` and many `employees`. Deleting a company cascades to its departments (ORM `cascade="all, delete-orphan"` on `departments`).

### `departments`

| Column | Notes |
|--------|--------|
| `id` | PK |
| `name` | `VARCHAR(255)`, not null |
| `company_id` | FK → `companies.id`, **`ON DELETE CASCADE`** |

**Constraint:** unique `(name, company_id)` (`uq_department_name_company`).

### `employees`

Single table for **HR records and login identity**: profile fields, **`password_hash`**, **`role`**, and **`is_active`** live here (there is no separate `users` table).

| Column | Notes |
|--------|--------|
| `id` | PK; JWT `sub` is this value |
| `first_name`, `last_name` | `VARCHAR(100)`, not null |
| `email` | `VARCHAR(255)`, unique, not null; login username |
| `mobile` | `VARCHAR(30)`, not null |
| `address` | `TEXT`, optional |
| `title` | `VARCHAR(150)`, not null |
| `hire_date` | `DATE`, not null |
| `status` | PostgreSQL enum **`employeestatus`**: `active`, `inactive` |
| `department_id` | FK → `departments.id`, **`ON DELETE SET NULL`**, nullable |
| `company_id` | FK → `companies.id`, **`ON DELETE RESTRICT`**, nullable |
| `password_hash` | `VARCHAR(255)`, not null (bcrypt in seed / API) |
| `role` | PostgreSQL enum **`userrole`**: `system_admin`, `hr_manager`, `employee` |
| `is_active` | `BOOLEAN`, default true; disabled accounts cannot authenticate |

**Tenant / admin semantics:**

- **System admin** (seeded `admin@pyhr.dev`): `company_id` and `department_id` are **null**; can operate across companies per RBAC.
- **HR manager** and **employee**: both FKs normally set; HR is scoped to `company_id` in routers.

### Enumerated types (PostgreSQL)

| Name | Values |
|------|--------|
| `employeestatus` | `active`, `inactive` |
| `userrole` | `system_admin`, `hr_manager`, `employee` |

## Foreign keys (summary)

| From | To | `ON DELETE` |
|------|-----|-------------|
| `departments.company_id` | `companies.id` | `CASCADE` |
| `employees.department_id` | `departments.id` | `SET NULL` |
| `employees.company_id` | `companies.id` | `RESTRICT` |

## Computed and API-only fields

These are **not** stored columns unless noted:

| Concept | Where it comes from |
|---------|---------------------|
| `days_employed` | `Employee` property: `today − hire_date`; exposed in API responses |
| Company `total_departments` / `total_employees` | Aggregated in company endpoints |
| Department `active_employee_count` | Aggregated in department endpoints |

## Related docs

- `entities.md` in this folder was written for an earlier design that included a separate **`users`** table. The running code uses **`employees`** for authentication; treat **`Database.md` as canonical** for the current schema.
