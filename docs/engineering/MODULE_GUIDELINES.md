# DSS Universe • Module Guidelines

> Version: 1.0
> Status: Approved
> Applies to: Backend modules

---

## Purpose

This document defines how backend modules should be designed, structured, named, and maintained in DSS Universe.

A module is not just a folder.

A module is a business capability with clear ownership, clear boundaries, and a predictable internal structure.

---

## Core Principle

Every module should be boringly predictable.

If a developer understands one mature DSS module, they should be able to understand any other mature DSS module.

---

## Standard Module Structure

A mature backend module should follow this structure:

```txt
modules/example/

domain/
  entities/
  repositories/
  value-objects/
  constants/
  exceptions/

application/
  services/
  use-cases/
  dto/
  mappers/

infrastructure/
  repositories/
  persistence/

presentation/
  controllers/
  dto/

example.module.ts
index.ts

Small modules may start with fewer folders, but they should grow toward this structure.

Module Responsibility

Each module owns one business area.

Examples:

users/
forum/
blog/
academy/
cms/
messages/
support/
downloads/

A module should not own unrelated business logic.

If a responsibility does not clearly belong to the module, stop and decide where it belongs before writing code.

Domain Layer

The domain layer contains business concepts and contracts.

It may contain:

entities;
value objects;
domain-specific constants;
domain-specific exceptions;
repository interfaces;
business rules that do not depend on infrastructure.

The domain layer must not depend on:

NestJS;
Prisma;
HTTP;
controllers;
database implementation;
external APIs.

Domain should be pure TypeScript whenever possible.

Application Layer

The application layer coordinates business use cases.

It may contain:

services;
use cases;
application DTOs;
mappers;
orchestration logic;
calls to repository contracts.

Application code may depend on the domain layer.

Application code should not depend directly on controllers or Prisma models.

Infrastructure Layer

The infrastructure layer contains technical implementations.

It may contain:

Prisma repository implementations;
persistence adapters;
external service adapters;
infrastructure-specific mappers when needed.

Infrastructure implements contracts defined by the domain or application layers.

Infrastructure may depend on Prisma, database clients, and other technical tools.

Presentation Layer

The presentation layer contains API-facing code.

It may contain:

controllers;
request DTOs;
response DTOs;
route decorators;
API-specific validation.

Controllers should be thin.

Controllers should call application services, not repositories directly.

Public API

Each module must expose its public API through:

index.ts

The module decides what is public.

Other modules should not import from internal folders unless explicitly approved.

Good:

import { UsersService } from '@/modules/users';

Avoid:

import { UsersService } from '@/modules/users/application/services/users.service';

Forbidden across module boundaries:

import { PrismaUsersRepository } from '@/modules/users/infrastructure/repositories/prisma-users.repository';
Repository Pattern

Repository contracts belong to the domain layer.

Recommended naming:

domain/repositories/example-query.repository.interface.ts
domain/repositories/example-mutation.repository.interface.ts

Query repositories are read-only.

Mutation repositories change state.

Prisma implementations belong to:

infrastructure/repositories/

Recommended naming:

prisma-example-query.repository.ts
prisma-example-mutation.repository.ts
Services

Application services should coordinate use cases.

They may:

validate business workflows;
call repositories;
call other application services;
throw application or domain exceptions;
return safe application results.

They should not:

access Prisma directly;
build HTTP responses;
contain controller-specific logic;
know about request objects.
Mappers

Mappers transform data between layers.

Examples:

Prisma model -> domain entity
domain entity -> safe user
domain entity -> response DTO

Mappers should not contain business rules.

If a mapper starts making business decisions, the logic probably belongs in a service or domain object.

DTO Rules

Presentation DTOs describe API input and output.

Application DTOs describe internal application operations.

Do not mix them blindly.

A request DTO should not automatically become a domain model.

Exceptions

Domain-specific exceptions belong in:

domain/exceptions/

Shared generic exceptions belong in:

shared/exceptions/

Do not create random exception classes next to controllers unless there is a strong reason.

Constants

Domain-specific constants belong in:

domain/constants/

Shared generic constants belong in:

shared/constants/

Avoid global constants when the constant belongs to one module only.

Naming Conventions

Use explicit names.

Good:

UsersService
UsersQueryRepository
UsersMutationRepository
PrismaUsersQueryRepository
UserNotFoundException
UserMapper
SafeUser

Avoid:

UserHelper
UserManager
CommonService
Utils
DataService

If the name is vague, the responsibility is probably vague.

Folder Creation Rule

Do not create folders just because the standard structure lists them.

Create a folder when there is a real responsibility to place there.

Good:

domain/value-objects/

only when the module actually has value objects.

Bad:

domain/value-objects/.gitkeep

just to make the tree look complete.

Cross-Module Imports

Modules should not reach into another module's internal folders.

Allowed:

import { UsersService } from '@/modules/users';

Forbidden:

import { UserMapper } from '@/modules/users/application/mappers/user.mapper';

If another module needs something, export it deliberately from the module public API.

Shared Extraction Rule

Do not move code into shared too early.

A good shared abstraction usually appears after the same pattern is needed by at least two or three modules.

Bad shared code becomes architectural debt.

Core Extraction Rule

Do not move business logic into core.

Core is for system infrastructure.

If the code talks about business concepts like users, forum topics, posts, lessons, or subscriptions, it probably does not belong in core.

Reference Module

The Users module is the reference implementation of DSS Universe backend module architecture.

New modules should follow Users unless an approved architectural decision states otherwise.

When in doubt:

open Users;
compare structure;
follow the established pattern;
document any intentional deviation.
Module Lifecycle

A module usually evolves through these stages:

1. Skeleton
2. Domain contracts
3. Infrastructure implementation
4. Application services
5. Presentation API
6. Tests
7. Documentation
8. Architecture audit

Do not skip architecture review for large modules.

Final Rule

A DSS module should be easy to navigate, easy to test, and hard to misuse.

If the module structure makes future development harder, the structure is wrong.
