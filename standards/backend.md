# Backend Standard

The backend is built with NestJS, Prisma, PostgreSQL, and modular architecture.

## Layers

Preferred flow:

```text
Controller
  ↓
Service
  ↓
Repository
  ↓
Prisma
Rules
Controllers handle HTTP.
Services handle business logic.
Repositories handle persistence.
DTOs validate input.
Services should not depend on HTTP request details.
Repositories should not know about DTOs.
Core modules contain infrastructure.
Feature modules contain business logic.
Auth

Authentication and authorization live in core/auth.

Business modules should use decorators like:

@Authenticated()
@Authenticated(UserRole.ADMIN)

They should not manually know about JWT strategies or Passport internals.
```
