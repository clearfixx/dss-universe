# DSS Backend Standard v1.0

## Core principles

DSS Universe backend is built on NestJS, but follows its own internal architecture standard.

NestJS is used for:

- modules
- dependency injection
- controllers
- guards
- pipes
- filters

Business architecture is defined by DSS Backend Standard.

## Module structure

Each business module should follow this structure:

````txt
src/modules/<module>/
├── <module>.module.ts
├── <module>.service.ts
├── controllers/
├── dto/
├── interfaces/
├── mappers/
├── repositories/
├── types/
├── constants/
└── exceptions/
Rules
1. Service must not know Prisma

Services depend on repository interfaces, not concrete Prisma repositories.

2. Repository is data access only

Repositories must not contain business logic.

3. Interface + DI token are required

Example:

export const USERS_REPOSITORY = Symbol('USERS_REPOSITORY');

export interface UsersRepository {
  findById(id: string): Promise<User | null>;
}
4. Prisma implementation naming
prisma-users.repository.ts
PrismaUsersRepository
5. Mapper handles output

Services should not manually remove private fields from models.

Use mappers:

UserMapper.toSafeUser(user);
6. Custom exceptions

Avoid throwing raw Nest exceptions across services.

Prefer:

throw new UserNotFoundException();
7. DTO is for input

DTO files describe request input.

Do not expose Prisma models directly as public API response contracts.

8. No Nest CLI by default

DSS Universe uses custom PowerShell bootstrap scripts instead of Nest CLI generators.

9. Avoid barrel imports for new code

Prefer explicit imports:

import { PrismaUsersRepository } from './repositories/prisma-users.repository';

instead of:

import { PrismaUsersRepository } from './repositories';

## 3. `docs/architecture/folder-structure.md`

```md
# Folder Structure

## Current backend structure

```txt
apps/api/src/
├── core/
│   ├── config/
│   └── database/
│
├── modules/
│   ├── users/
│   └── auth/
│
├── shared/
│   ├── constants/
│   ├── types/
│   ├── utils/
│   ├── helpers/
│   └── validators/
│
├── app.module.ts
└── main.ts
core

Infrastructure-level code.

Examples:

config
database
cache
mail
logger
storage
queue
events
modules

Business modules.

Examples:

users
auth
forum
academy
cms
ai
support
research-lab
shared

Pure TypeScript utilities that do not depend on NestJS.

Examples:

common types
helpers
validators
constants
utility functions

## 4. `docs/architecture/naming-conventions.md`

```md
# Naming Conventions

## Modules

```txt
users.module.ts
auth.module.ts
forum.module.ts
Services
users.service.ts
auth.service.ts
Controllers
users.controller.ts
auth.controller.ts
Repository interfaces
users.repository.interface.ts

Token:

USERS_REPOSITORY

Interface:

UsersRepository
Prisma repositories
prisma-users.repository.ts

Class:

PrismaUsersRepository
Mappers
user.mapper.ts

Class:

UserMapper
Exceptions
user-not-found.exception.ts
email-already-exists.exception.ts

Class:

UserNotFoundException
EmailAlreadyExistsException
Constants
user-errors.constant.ts
auth-errors.constant.ts

## 5. `docs/architecture/coding-style.md`

```md
# Coding Style

## Imports

Use explicit imports for new code.

Good:

```ts
import { UserMapper } from './mappers/user.mapper';

Avoid:

import { UserMapper } from './mappers';
Type-only imports

When using decorated constructor signatures with interfaces, use type imports:

import { USERS_REPOSITORY } from './interfaces/users.repository.interface';
import type { UsersRepository } from './interfaces/users.repository.interface';
Services

Services contain business logic.

They should not:

call Prisma directly
format raw API responses manually
contain HTTP decorators
contain database query details
Repositories

Repositories contain data access only.

They should not:

hash passwords
generate tokens
send emails
format responses
apply business rules
Mappers

Mappers are static classes.

They should not use dependency injection.

Exceptions

Prefer module-specific exceptions over raw Nest exceptions.


## 6. `docs/architecture/decisions.md`

```md
# Architecture Decisions

## ADR-001: Use custom backend architecture standard

Status: Accepted

DSS Universe uses NestJS as a framework foundation, but follows its own internal backend module standard.

Reason:
- predictable structure
- scalable architecture
- easier onboarding
- less technical debt

## ADR-002: Do not use Nest CLI by default

Status: Accepted

Nest CLI generators are not used by default.

Reason:
- generated structure does not fully match DSS standards
- avoids unnecessary files
- custom PowerShell bootstrap scripts are faster and more precise

## ADR-003: Use core / modules / shared structure

Status: Accepted

Backend source structure:

```txt
core/
modules/
shared/

Reason:

separates infrastructure, business logic, and reusable pure utilities
avoids turning common/ into a dumping ground
ADR-004: Use repository interfaces with DI tokens

Status: Accepted

Services depend on repository interfaces, not Prisma classes.

Reason:

easier testing
future cache layer support
replaceable data access implementation
cleaner business logic
ADR-005: Use mappers for public responses

Status: Accepted

Prisma models must not be returned directly from services/controllers.

Reason:

prevents accidental exposure of private fields
keeps response formatting consistent
ADR-006: Prefer explicit imports over barrel exports

Status: Accepted

New code should use explicit imports.

Reason:

reduces circular dependency risk
improves navigation
makes dependencies clearer

Після цього запускай:

```powershell
Get-ChildItem .\docs\architecture
````

Infrastructure belongs to core.

Business belongs to modules.

Shared pure code belongs to shared.

Infrastructure must never live inside business modules.
