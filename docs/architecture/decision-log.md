# DSS Universe — Architecture Decision Log 🛰️

## ADR-0001 — Permissions Are the Source of Truth

Status: Accepted
Phase: 2.5 — Roles & Permission Management

### Decision

DSS Universe uses permissions as the source of truth for backend authorization.

Roles are containers for permissions.

### Reason

Roles can change meaning over time.

Permissions are more stable and precise.

### Consequence

Backend code should check permissions, not role names.

---

## ADR-0002 — Database-Driven RBAC

Status: Accepted
Phase: 2.4.5 — RBAC Core Migration

### Decision

DSS uses database-backed roles and permissions instead of enum-based `User.role`.

### Model

```txt
User -> UserRole -> Role -> RolePermission -> Permission
User -> UserPermission -> Permission
Consequence

Users can have multiple roles and direct permissions.

ADR-0003 — Lowercase Role Names

Status: Accepted
Phase: 2.5 — Roles & Permission Management

Decision

Role names are stored as lowercase identifiers.

Examples:

user
moderator
admin
owner
Reason

Lowercase role names avoid duplicated roles like ADMIN and admin.

ADR-0004 — DSS File Passport

Status: Accepted
Phase: 2.5 — Roles & Permission Management

Decision

New source files should start with a DSS File Passport.

Reason

The passport makes file ownership and intent visible immediately.

ADR-0005 — Read Before Refactor

Status: Accepted
Phase: 2.5 — Roles & Permission Management

Decision

Before refactoring an existing module, inspect its real files first.

Reason

Guessing file paths or structure creates avoidable bugs.
```
