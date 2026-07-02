# Core / Authentication 🔐

## Purpose

The Core Authentication layer provides shared authentication infrastructure for the entire DSS Universe platform.

Unlike the Authentication module, this directory contains reusable framework integrations rather than business use cases.

---

## Responsibility

Core Authentication owns the technical foundation required to authenticate requests across the platform.

Examples include:

- JWT strategy
- authentication guards
- decorators
- authenticated user types
- JWT payload contracts
- shared authentication constants

---

## Architecture

```text
HTTP Request
      ↓
JwtAuthGuard
      ↓
JwtStrategy
      ↓
AuthenticatedUser
      ↓
Controller
```

Business authentication flows such as login, registration, refresh, and logout belong to the **Authentication module**, not here.

---

## Must contain

- authentication infrastructure
- NestJS authentication integrations
- guards
- decorators
- strategies
- shared authentication types
- technical authentication helpers

---

## Must not contain

- login logic
- registration logic
- refresh token workflows
- password hashing
- authorization rules
- permissions
- role policies
- business logic

---

## Relationship with other modules

### Core Authentication

Responsible for:

- request authentication;
- JWT validation;
- authenticated request context.

### Authentication Module

Responsible for:

- login;
- registration;
- refresh;
- logout;
- password hashing;
- token issuing.

### Authorization Core

Responsible for:

- roles;
- permissions;
- access profiles;
- permission guards.

---

## Notes

Core Authentication authenticates the request.

Authentication manages the authentication lifecycle.

Authorization decides what an authenticated user is allowed to do.

🚀 Build. Share. Grow.
