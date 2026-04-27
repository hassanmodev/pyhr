# pyhr

Small **HR / employee management** app: companies, departments, and employees with **JWT login** and **role-based access** (system admin, HR manager, employee). The UI is a React SPA; the API is **Flask** with PostgreSQL.

**Interactive API docs** (Swagger UI, generated from route docstrings): [http://localhost:8005/apidocs](http://localhost:8005/apidocs) when the stack is up. Raw **Swagger 2.0 JSON**: [http://localhost:8005/apispec_1.json](http://localhost:8005/apispec_1.json). A written overview lives in [be/docs/API.md](be/docs/API.md).

## Running

```bash
# 1. Copy and edit env vars (DB credentials, JWT secret)
cp .env.example .env

# 2. Start all services (Postgres, Flask, React)
docker compose up --build -d
```


| Service  | URL |
| -------- | --- |
| Frontend | [http://localhost:5173](http://localhost:5173) |
| API      | [http://localhost:8005](http://localhost:8005) |
| API docs (Swagger UI) | [http://localhost:8005/apidocs](http://localhost:8005/apidocs) |
| OpenAPI JSON (generated) | [http://localhost:8005/apispec_1.json](http://localhost:8005/apispec_1.json) |


## Backend docs

| Doc | Contents |
|-----|----------|
| [be/docs/API.md](be/docs/API.md) | Auth, errors, route map, links to `/apidocs` and `/apispec_1.json` |
| [be/docs/Database.md](be/docs/Database.md) | Schema, FK behaviour, enum types, seeding, computed fields |
| [be/docs/entities.md](be/docs/entities.md) | Quick entity reference with column listings |

## Seeding data

Run inside the `api` container after the stack is up:

```bash
# First time — idempotent, skips existing records
docker compose exec api python -m src.seed

# Wipe all rows and re-seed cleanly
docker compose exec api python -m src.seed --reset
```

### Demo logins (after seed)


| Role           | Email                                | Password       |
| -------------- | ------------------------------------ | -------------- |
| System admin   | `admin@pyhr.dev`                     | `admin1234`    |
| HR managers    | `hr@cairotech.eg`, `hr@alextrade.eg` | `hr1234`       |
| Demo employees | *(emails printed when you run seed)* | `employee1234` |


