# pyhr

Small **HR / employee management** app: companies, departments, and employees with **JWT login** and **role-based access** (system admin, HR manager, employee). The UI is a React SPA; the API is FastAPI with PostgreSQL.

## Running

```bash
# 1. Copy and edit env vars (DB credentials, JWT secret)
cp .env.example .env

# 2. Start all services (Postgres, FastAPI, React)
docker compose up --build -d
```


| Service  | URL                                                      |
| -------- | -------------------------------------------------------- |
| Frontend | [http://localhost:5173](http://localhost:5173)           |
| API      | [http://localhost:8005](http://localhost:8005)           |
| API docs | [http://localhost:8005/docs](http://localhost:8005/docs) |


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


