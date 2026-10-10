# DSS Universe — Module Boundaries 🧱

## Rule

A module owns its internal files.

Other modules should use its public API through `index.ts`.

Prefer:

```ts
import { IamModule } from "./modules/iam";
```

Avoid deep imports into another module's internals.

## Auth vs Authorization

Authentication answers:

Who are you?

Authorization answers:

What are you allowed to do?

Do not mix them.

## IAM

IAM owns:

roles;
permissions;
user-role assignments;
user-permission assignments;
effective access summaries.

Generic access-group membership/assignment and Premium grants belong to IAM.
Authorization owns the effective capability decision, including denial precedence.
Auth works with an opaque subject and credentials, not a Users profile aggregate.
Registration and combined responses use explicit composition.
See [ADR-003](adr/003-subject-and-access-ownership.md) for the owner-approved direction
and [ADR-004](adr/004-module-integration-contracts.md) for integration design.

IAM does not own login, password hashing, or token refresh.

## Guards

Guards protect routes.

Guards should not contain domain business logic.

## Services

Services own business decisions.

Application services use module-owned repository/capability contracts, not
database-specific services or foreign module internals. Infrastructure adapters
own Prisma/provider details. Existing violations remain D2–D4 debt.
Public `index.ts` exports are explicit and narrow; a barrel does not authorize
exporting every concrete service or using wildcard exports.

## Repositories

Repositories access data.

Repositories should not decide business rules.

## Evidence, not false green

The [AST inventory and frozen baseline](ARCHITECTURE_TOOLING.md) expose existing
D3/D4 debt. Report-only success or a matching baseline does not prove architectural
compliance. The older checker is only a small blocking subset.
