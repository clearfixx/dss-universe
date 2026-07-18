# DSS Universe • Architecture Rules

> Version: 1.0
> Status: Approved
> Applies to: Backend (NestJS API)

---

# Purpose

This document defines the architectural rules of DSS Universe.

These rules exist to ensure that the project remains maintainable, predictable, scalable, and easy to understand regardless of its size.

Every contributor should follow these rules unless an explicit architectural decision states otherwise.

---

# Philosophy

DSS Universe is built as a long-term platform.

Architecture is considered a product, not a by-product.

Consistency is preferred over cleverness.

Explicitness is preferred over magic.

Simplicity is preferred over unnecessary abstraction.

---

# Architectural Principles

## 1. Single Responsibility

Every class, service, repository, mapper, controller, and utility should have one clear responsibility.

If a class is responsible for multiple unrelated tasks, it should be split.

---

## 2. Layer Separation

Business logic must be separated from infrastructure.

The application should be organized into clearly defined layers.

```
Presentation
      ↓
Application
      ↓
Domain

Infrastructure
      ↓
implements contracts defined above
```

Dependencies always point inward.

---

## 3. Domain Independence

The Domain layer is the heart of the application.

Domain code must not depend on:

- NestJS
- Prisma
- HTTP
- Controllers
- Database implementation
- Framework-specific features

Domain should be pure TypeScript whenever possible.

---

## 4. Infrastructure Is Replaceable

Infrastructure exists to support the application.

Infrastructure may change.

Business rules should not.

Examples:

- Prisma
- PostgreSQL
- Redis
- Queue implementation
- Mail provider

should all be replaceable without rewriting business logic.

---

## 5. Controllers Are Thin

Controllers should:

- validate requests;
- call application services;
- return responses.

Controllers should never contain business logic.

---

## 6. Services Coordinate

Application services coordinate business operations.

They may:

- call repositories;
- call other services;
- execute use cases;
- enforce business workflows.

They should not contain infrastructure-specific code.

---

## 7. Repositories Own Persistence

Repositories are responsible only for persistence.

Repositories should not:

- validate HTTP requests;
- build responses;
- send emails;
- perform authorization;
- know about controllers.

---

## 8. Mappers Transform Data

Mappers convert one representation into another.

Examples:

- Entity → DTO
- Prisma Model → Domain Model
- Domain Model → Response

Mappers should never contain business rules.

---

# Module Rules

Every business feature belongs to exactly one module.

Standard module structure:

```
module/

domain/

application/

infrastructure/

presentation/

module.ts

index.ts
```

Every module should look familiar.

---

# Core Rules

The Core layer contains application-wide infrastructure.

Examples:

- Auth
- Config
- Database
- Security
- Cache
- Logger
- Queue
- Mail
- Scheduler
- Events

Core must not contain business logic.

---

# Shared Rules

Shared contains reusable building blocks.

Shared may contain:

- common types;
- repository contracts;
- exceptions;
- constants;
- utilities;
- value objects.

Shared must remain business-neutral.

If something belongs to one module only, it does not belong in Shared.

---

# Import Rules

Allowed:

```
modules → shared

modules → core

presentation → application

application → domain

infrastructure → domain
```

Forbidden:

```
shared → modules

shared → core

core → modules

domain → infrastructure

domain → presentation

application → presentation
```

---

# Public APIs

Every module should expose a public API through:

```
index.ts
```

Consumers should import from the module root whenever possible.

Avoid deep imports across module boundaries.

---

# Naming Rules

Names should describe responsibility.

Good:

```
PaginationOptions

UserMapper

UsersService

UsersQueryRepository

UserNotFoundException
```

Avoid generic names:

```
Helper

Common

Base

Stuff

Utils2

Manager
```

If a name is too generic, the responsibility is probably unclear.

---

# Error Handling

Business errors belong to the Domain layer.

Application converts business outcomes into application behavior.

Presentation converts application exceptions into HTTP responses.

---

# Dependency Injection

Depend on interfaces, not implementations.

Application should know contracts.

Infrastructure provides implementations.

---

# Reference Module

The Users module is the reference implementation of DSS Universe architecture.

New modules should follow the same structure and conventions.

---

# Code Style

Prefer readability over compactness.

Avoid premature optimization.

Write code that is easy to understand six months later.

Consistency is more valuable than personal preference.

---

# Architecture Evolution

Architecture may evolve.

Architecture must never drift.

Every significant architectural change should:

1. be discussed;
2. be documented;
3. be approved;
4. be implemented consistently.

---

# Final Rule

When making an architectural decision, ask one question:

> Will this decision still make sense when DSS Universe contains fifty modules and hundreds of thousands of lines of code?

If the answer is "no", redesign it before writing the code.
