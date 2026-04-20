# Database Entities

Four tables. All use `SERIAL` PKs and `created_at / updated_at` timestamps.

---

## companies

Top-level tenant. Aggregate stats (department count, employee count) are **computed on read** — no stored counters.

```
companies
├── id            SERIAL          PK
├── name          VARCHAR(255)    NOT NULL  UNIQUE
├── created_at    TIMESTAMP
└── updated_at    TIMESTAMP
```

---

## departments

Scoped to one company. Active employee count is computed on read via JOIN.

```
departments
├── id            SERIAL          PK
├── name          VARCHAR(255)    NOT NULL
├── company_id    INTEGER         NOT NULL  FK → companies.id  (CASCADE DELETE)
├── created_at    TIMESTAMP
└── updated_at    TIMESTAMP

UNIQUE(name, company_id)
```

---

## employees

Core record. `days_employed` is derived at query time (`CURRENT_DATE − hire_date`) — never stored.  
`company_id` is kept alongside `department_id` so the API can enforce in one check that the department belongs to the selected company.

```
employees
├── id              SERIAL          PK
├── first_name      VARCHAR(100)    NOT NULL
├── last_name       VARCHAR(100)    NOT NULL
├── email           VARCHAR(255)    NOT NULL  UNIQUE
├── mobile          VARCHAR(30)     NOT NULL
├── address         TEXT
├── title           VARCHAR(150)    NOT NULL  -- job title / position
├── hire_date       DATE            NOT NULL  -- source for days_employed
├── status          VARCHAR(20)     NOT NULL  DEFAULT 'active'
│                   CHECK IN ('active', 'inactive')
├── department_id   INTEGER         FK → departments.id  (SET NULL on delete)
├── company_id      INTEGER         NOT NULL  FK → companies.id
├── created_at      TIMESTAMP
└── updated_at      TIMESTAMP
```

> **Bonus:** `status` can be extended to a workflow enum:  
> `'application_received' | 'interview_scheduled' | 'hired' | 'not_accepted'`

---

## users

Authentication + RBAC. One record per login.  
Created automatically when an employee record is created (`role = 'employee'`).  
Admins and HR Managers are seeded or created out-of-band.

```
users
├── id              SERIAL          PK
├── email           VARCHAR(255)    NOT NULL  UNIQUE
├── password_hash   VARCHAR(255)    NOT NULL  -- bcrypt / argon2
├── role            VARCHAR(20)     NOT NULL
│                   CHECK IN ('system_admin', 'hr_manager', 'employee')
├── employee_id     INTEGER         FK → employees.id  -- NULL for admin / hr
├── company_id      INTEGER         FK → companies.id  -- NULL for system_admin; set for hr_manager
├── is_active       BOOLEAN         DEFAULT TRUE
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
| users.employee_id | employees.id | SET NULL |
| users.company_id | companies.id | SET NULL |

---

## Computed Fields

| Field | Computed from | Exposed on |
|-------|--------------|-----------|
| `days_employed` | `CURRENT_DATE − employees.hire_date` | employee responses |
| `total_departments` | `COUNT(departments)` | company responses |
| `total_employees` | `COUNT(employees WHERE active)` | company responses |
| `active_employee_count` | `COUNT(employees WHERE active)` | department responses |
