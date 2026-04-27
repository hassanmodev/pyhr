# Database Entities

Three tables. All use integer PKs and `created_at / updated_at` timestamps (via `TimestampMixin`).

> **Canonical reference:** `Database.md` in this folder covers FK behaviour, enum types, and computed fields in more detail.

---

## companies

Top-level tenant. Aggregate stats (department count, employee count) are **computed on read** — no stored counters.

```
companies
├── id            INTEGER         PK
├── name          VARCHAR(255)    NOT NULL  UNIQUE
├── created_at    TIMESTAMP
└── updated_at    TIMESTAMP
```

---

## departments

Scoped to one company. Active employee count is computed on read via JOIN.

```
departments
├── id            INTEGER         PK
├── name          VARCHAR(255)    NOT NULL
├── company_id    INTEGER         NOT NULL  FK → companies.id  (CASCADE DELETE)
├── created_at    TIMESTAMP
└── updated_at    TIMESTAMP

UNIQUE(name, company_id)
```

---

## employees

Core record for **both HR profile and login identity** — there is no separate `users` table.  
`days_employed` is derived at query time (`today − hire_date`) — never stored.  
`company_id` is nullable so system admins can exist without a company assignment.

```
employees
├── id              INTEGER         PK
├── first_name      VARCHAR(100)    NOT NULL
├── last_name       VARCHAR(100)    NOT NULL
├── email           VARCHAR(255)    NOT NULL  UNIQUE  -- login username
├── mobile          VARCHAR(30)     NOT NULL
├── address         TEXT
├── title           VARCHAR(150)    NOT NULL  -- job title / position
├── hire_date       DATE            NOT NULL  -- source for days_employed
├── status          employeestatus  NOT NULL  DEFAULT 'active'
│                   ENUM('active', 'inactive')
├── department_id   INTEGER         FK → departments.id  (SET NULL on delete)
├── company_id      INTEGER         FK → companies.id  (RESTRICT on delete)  -- nullable for system_admin
├── password_hash   VARCHAR(255)    NOT NULL  -- bcrypt
├── role            userrole        NOT NULL
│                   ENUM('system_admin', 'hr_manager', 'employee')
├── is_active       BOOLEAN         NOT NULL  DEFAULT true  -- false = account locked
├── created_at      TIMESTAMP
└── updated_at      TIMESTAMP
```

---

## Relationships

| FK | References | On Delete |
|----|-----------|-----------|
| departments.company_id | companies.id | CASCADE |
| employees.company_id | companies.id | RESTRICT |
| employees.department_id | departments.id | SET NULL |

---

## Computed Fields

| Field | Computed from | Exposed on |
|-------|--------------|-----------|
| `full_name` | `first_name + ' ' + last_name` | employee responses |
| `days_employed` | `today − employees.hire_date` | employee responses |
| `total_departments` | `COUNT(departments)` | company responses |
| `total_employees` | `COUNT(employees)` | company responses |
| `active_employee_count` | `COUNT(employees WHERE status='active')` | department responses |
