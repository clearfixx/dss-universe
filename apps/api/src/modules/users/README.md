# Users Module Passport 👤

## Purpose

The Users module owns user-related domain data and provides a clean application boundary for reading, updating, and exposing user information inside DSS Universe.

This module is the reference implementation for the current backend module architecture.

---

## Layer Structure

```txt
users/
├── application/
│   ├── dto/
│   ├── mappers/
│   ├── services/
│   └── types/
├── domain/
│   ├── constants/
│   ├── contracts/
│   ├── exceptions/
│   ├── mappers/
│   ├── options/
│   ├── repositories/
│   └── types/
├── infrastructure/
│   └── repositories/
├── presentation/
│   └── controllers/
├── index.ts
└── users.module.ts
Architecture Flow
Controller
  ↓
Application Service
  ↓
Repository Contract
  ↓
Infrastructure Repository
  ↓
Database

For public responses:

UserRecord
  ↓
UserMapper
  ↓
SafeUser
  ↓
UserResponseMapper
  ↓
UserResponseDto
Rules

Controllers are thin.
They receive HTTP requests and delegate work to application services.

Application services own use cases.
They do not know about HTTP and do not access Prisma directly.

Repository contracts live in the domain layer.
They must not expose Prisma-specific types.

Infrastructure repositories implement domain repository contracts.
Prisma stays inside infrastructure.

UserRecord may contain internal and sensitive fields.
It must never be exposed through controllers.

SafeUser must not contain authentication secrets.

Response DTOs define public API contracts.
Dates should be serialized as strings for HTTP responses.

Current Boundary

The Users module currently owns the user account and profile foundation:

identity fields;
profile identity, biography, location and website;
technology and interest collections;
ordered, normalized social links with soft-disable history;
status;
email verification timestamp;
last seen timestamp;
authentication-related internal hashes.

Profile updates are exposed through the authenticated GraphQL viewer boundary.
Social-link collections are replaced transactionally, audited, and resolved
through a request-scoped DataLoader for list safety.
Avatar and cover binaries belong to DSS Media Platform.
Social relationships, privacy policies and profile walls are separate Phase 7
packages and must not be improvised inside controllers.

Notes

Users is the airlock between identity data and the rest of DSS Universe.

Raw records stay inside.
Safe DTOs may leave the station.

🚀 Build. Share. Grow.
```
