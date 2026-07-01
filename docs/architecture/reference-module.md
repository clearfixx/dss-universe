# 🚀 DSS Universe

# Reference Module Standard

Version: 1.0

---

# Purpose

This document defines the engineering standard for every feature module inside DSS Universe.

A Reference Module is not simply a working module.

It is an architectural template that demonstrates how every future module should be designed, implemented and maintained.

Examples of future feature modules:

- Users
- Forum
- Blog
- Academy
- CMS
- AI
- Messaging
- Support Center
- Downloads
- Research Lab

Every new module should follow this document unless an architectural decision explicitly states otherwise.

---

# Goals

A Reference Module should provide:

- predictable project structure;
- clear architectural boundaries;
- minimal coupling;
- explicit public API;
- reusable development patterns;
- consistent code style;
- maintainable folder structure;
- easy onboarding for new developers.

The objective is not only to make the current module understandable, but also to make every future module look familiar.

---

# Architectural Layers

Every feature module follows the same four-layer architecture.

```
Feature Module
│
├── presentation
├── application
├── domain
└── infrastructure
```

Each layer has a single responsibility.

---

# Presentation Layer

Responsibilities

- HTTP Controllers
- GraphQL Resolvers (future)
- CLI Commands (future)
- Request parsing
- Response serialization
- Authorization
- Authentication
- Transport mapping

Presentation DOES:

- receive requests;
- validate transport input;
- convert transport models into application/domain models;
- call application services.

Presentation NEVER:

- accesses Prisma directly;
- contains business logic;
- knows database implementation details.

---

# Application Layer

Responsibilities

- application services;
- orchestration;
- DTO mapping;
- business use-case coordination.

Application DOES:

- coordinate repositories;
- execute use cases;
- convert domain models into DTOs;
- coordinate transactions.

Application NEVER:

- knows HTTP;
- knows Controllers;
- depends on Prisma implementation;
- accesses infrastructure directly.

---

# Domain Layer

Responsibilities

- business contracts;
- repository interfaces;
- entities;
- domain types;
- value objects;
- domain exceptions;
- domain constants.

Domain is the heart of the module.

Domain MUST NOT know anything about:

- NestJS;
- HTTP;
- Controllers;
- Prisma repositories;
- Express;
- REST;
- GraphQL;
- infrastructure implementation.

The Domain defines rules.

It never defines transport.

---

# Infrastructure Layer

Responsibilities

- Prisma repositories;
- external APIs;
- storage;
- cache;
- queues;
- third-party integrations.

Infrastructure implements contracts defined by the Domain.

Infrastructure MAY depend on:

- Prisma;
- NestJS;
- Core modules;
- Shared contracts.

Infrastructure MUST NOT contain business rules.

Its only purpose is to make the outside world accessible to the application.

---

# Layer Dependency Rules

Allowed dependency flow

```
Presentation
        │
        ▼
Application
        │
        ▼
Domain
        ▲
        │
Infrastructure
```

Infrastructure implements Domain contracts.

Presentation communicates with Application.

Application coordinates Domain.

Domain depends only on itself and Shared.

---

# Public API

Every feature module has exactly one public entry point.

Example:

```
users/
    index.ts
```

Other modules must import Users functionality only through this file.

Good

```ts
import { UsersService } from '@api/modules/users';
```

Bad

```ts
import { UsersService } from '@api/modules/users/application/services/users.service';
```

Internal folder structure must remain private.

---

# Public API Growth Rule

Public API starts as small as possible.

Nothing should be exported "just in case."

Every export must have at least one real consumer.

If nobody imports a symbol outside the module,
it should remain internal.

---

# Public API Verification Rule

Before exposing a new symbol:

1. Remove the export.
2. Build the project.
3. If nothing breaks,
   the export was unnecessary.
4. Keep it internal.

Public API should grow because of real architectural needs,
not future assumptions.

---

# Repository Pattern

Repositories belong to the Domain.

Repositories define WHAT can be done.

Infrastructure defines HOW it is done.

Example

```
Domain
│
└── UsersRepository

Infrastructure
│
└── PrismaUsersRepository
```

Application services never know which repository implementation is used.

---

# Options Pattern

Repositories accept Domain Options.

Good

```ts
findMany(options: ListUsersOptions)
```

Avoid transport-specific models.

Bad

```ts
findMany(queryDto)

findMany(httpQuery)

findMany(restRequest)
```

Options belong to the Domain.

Transport belongs to Presentation.

Application coordinates between them.

# DTO Layer

DTOs belong to the Application Layer.

Their purpose is to describe transport-safe application models.

DTOs are NOT domain objects.

DTOs are NOT Prisma models.

DTOs are NOT entities.

DTOs should never leak into Domain.

---

# Mapper Layer

Every conversion between architectural layers should happen inside dedicated mappers.

Typical mappings include:

```
HTTP Request
        │
        ▼
CreateUserDto
        │
        ▼
CreateUserContract
        │
        ▼
Repository
```

and

```
UserRecord
        │
        ▼
UserResponseMapper
        │
        ▼
UserResponseDto
```

Mappers have one responsibility:

Translate data.

Mappers never contain business logic.

---

# Shared Layer

Shared contains only truly reusable contracts.

Examples:

- Pagination
- Result wrappers
- Shared interfaces
- Common utility types

Shared is NOT:

- a dumping ground;
- a second Domain;
- a place for future abstractions.

Every object inside Shared must be reusable by multiple feature modules.

If something is used only by one module,
it belongs inside that module.

---

# Single Source of Truth

Every architectural concept must have exactly one owner.

Examples

Pagination

Owner:

```
shared/
```

Repository contracts

Owner:

```
domain/
```

DTO

Owner:

```
application/
```

Never duplicate:

- interfaces;
- contracts;
- enums;
- repository APIs.

If duplication appears,
one of the copies is in the wrong place.

---

# Placeholder Rule

Never create folders for future possibilities.

Create folders only when the first real implementation appears.

Good

```
application/
    services/
```

because UsersService exists.

Bad

```
events/
listeners/
jobs/
commands/
queries/
```

when they contain no real implementation.

Architecture should reflect reality,
not assumptions.

---

# Folder Lifecycle Rule

Folders have a lifecycle.

Folder created
↓

Real implementation added
↓

Folder maintained

If the last implementation disappears,
the folder disappears too.

Empty folders are considered technical debt.

# Boy Scout Rule

Whenever a file is opened during development,
leave it in a better state than you found it.

Examples:

- update File Passport;
- remove unused imports;
- remove obsolete exports;
- improve comments;
- fix formatting;
- simplify local technical debt.

Do not perform unrelated large-scale refactoring.

Improve only what naturally belongs to the current work.

---

# File Passport Standard

Every source file should begin with a DSS File Passport.

A File Passport documents:

- module;
- file location;
- purpose;
- responsibilities;
- architectural role;
- important implementation notes;
- engineering notes.

Every source file should also end with a footer comment.

The footer is not decorative.

It reminds future developers about the architectural responsibility of the file.

---

# Reference Module Audit

Before declaring a feature module complete,
it should pass the Reference Module Audit.

Checklist

□ Project builds successfully.

□ TypeScript reports zero errors.

□ Public API is minimal.

□ No unnecessary exports exist.

□ Layer boundaries are respected.

□ Domain has no forbidden dependencies.

□ Application has no infrastructure knowledge.

□ Presentation contains no business logic.

□ Infrastructure depends only on allowed layers.

□ File Passports are present.

□ File paths inside Passports are correct.

□ Folder structure contains no unused placeholders.

□ Smoke tests pass.

□ Documentation is updated.

□ Version History is updated.

Only after completing this checklist can a module be considered a Reference Module.

---

# Why Reference Modules Exist

A Reference Module is not created to solve only one feature.

Its purpose is to reduce future architectural decisions.

Instead of reinventing project structure for every new module,
developers can follow an already proven implementation.

This provides:

- consistent architecture;
- faster development;
- easier code reviews;
- lower onboarding cost;
- predictable maintenance.

The first Reference Module requires the most effort.

Every module after it becomes significantly easier to build.

---

# DSS Philosophy

Good architecture is not measured by the number of abstractions.

Good architecture is measured by clarity.

A module should be easy to understand,
easy to navigate,
easy to extend,
and difficult to misuse.

When a developer opens any DSS Universe module,
they should immediately recognize its structure.

Consistency is one of the strongest engineering tools.

---

# Final Principle

Build modules that future developers will enjoy maintaining.

Not modules that only today's developer can understand.

Because software lives much longer than the code that created it.

---

**Build. Share. Grow. 🚀**
