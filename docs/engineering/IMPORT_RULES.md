# DSS Universe • Import Rules

> Version: 1.0
> Status: Approved
> Applies to: Backend (NestJS API)

---

# Purpose

This document defines import rules for DSS Universe.

The goal is to keep dependencies predictable, prevent architectural violations, and make refactoring safe.

Imports should always reflect the architectural boundaries of the project.

---

# General Principles

Imports should always point toward stable abstractions.

Prefer:

- public APIs;
- interfaces;
- contracts;
- shared abstractions.

Avoid:

- implementation details;
- deep imports;
- hidden dependencies.

---

# Dependency Direction

The dependency flow is always:

```txt
Presentation
        ↓
Application
        ↓
Domain

Infrastructure
        ↓
implements Domain/Application contracts
```

Dependencies should always point inward.

---

# Allowed Imports

## Modules → Shared

Allowed:

```ts
import { PaginationOptions } from "@/shared/domain";
```

---

## Modules → Core

Allowed:

```ts
import { DatabaseService } from "@/core/database";
```

---

## Presentation → Application

Allowed:

```ts
import { UsersService } from "../application/services/users.service";
```

---

## Application → Domain

Allowed:

```ts
import type { UsersQueryRepository } from "../domain/repositories/users-query.repository.interface";
```

---

## Infrastructure → Domain

Allowed:

```ts
import type { UsersMutationRepository } from "../domain/repositories/users-mutation.repository.interface";
```

---

# Forbidden Imports

## Shared → Modules

Forbidden:

```ts
import { UsersService } from "@/modules/users";
```

Shared must never know that business modules exist.

---

## Shared → Core

Forbidden:

```ts
import { DatabaseService } from "@/core/database";
```

Shared must remain infrastructure-neutral.

---

## Core → Modules

Forbidden:

```ts
import { UsersService } from "@/modules/users";
```

Core should never contain business dependencies.

---

## Domain → Infrastructure

Forbidden:

```ts
import { PrismaService } from "@/core/database";
```

The domain must not know how persistence works.

---

## Domain → Presentation

Forbidden:

```ts
import { UserResponseDto } from "../presentation/dto";
```

The domain should not know about HTTP.

---

## Application → Presentation

Forbidden:

```ts
import { CreateUserDto } from "../presentation/dto";
```

Application services should use application DTOs instead.

---

# Public API Rule

Every module should expose a public API through:

```txt
index.ts
```

Preferred:

```ts
import { UsersService } from "@/modules/users";
```

Avoid:

```ts
import { UsersService } from "@/modules/users/application/services/users.service";
```

---

# Deep Imports

Deep imports are discouraged.

Good:

```ts
import { SafeUser } from "@/modules/users";
```

Bad:

```ts
import { SafeUser } from "@/modules/users/application/types/safe-user.type";
```

The only acceptable reason for a deep import is when no public API exists yet.

---

# Relative Imports

Inside the same module:

Relative imports are preferred.

Example:

```ts
import { UserMapper } from "../mappers/user.mapper";
```

Avoid long alias chains inside one module.

---

# Cross-Module Imports

Business modules should not access each other's internals.

Allowed:

```ts
import { UsersService } from "@/modules/users";
```

Forbidden:

```ts
import { UserMapper } from "@/modules/users/application/mappers/user.mapper";
```

If another module needs something, export it intentionally.

---

# Shared Imports

Shared code should import only from:

- itself;
- TypeScript;
- approved third-party libraries.

Shared should never depend on business modules.

---

# Core Imports

Core may import from:

- shared;
- other core components (when justified).

Core should never depend on:

- forum;
- users;
- blog;
- academy;
- CMS;
- messages;
- other business modules.

---

# Infrastructure Imports

Infrastructure may depend on:

- Prisma;
- NestJS;
- external SDKs;
- database libraries.

Business logic should remain outside infrastructure.

---

# Circular Dependencies

Circular dependencies are forbidden.

If two modules depend on each other, the architecture should be redesigned.

Never solve circular dependencies by adding more imports.

Solve the design instead.

---

# Import Aliases

Preferred aliases:

```txt
@/core
@/shared
@/modules
```

Future packages may expose:

```txt
@dss/contracts
@dss/sdk
@dss/ui
```

---

# Import Order

Recommended order:

```txt
1. Node.js
2. External libraries
3. Core
4. Shared
5. Modules
6. Relative imports
```

Example:

```ts
import { Injectable } from "@nestjs/common";

import { DatabaseService } from "@/core/database";
import { PaginationOptions } from "@/shared/domain";

import { UsersService } from "@/modules/users";

import { UserMapper } from "../mappers/user.mapper";
```

---

# Future Automation

These rules should eventually be enforced by:

- TypeScript path aliases;
- ESLint;
- dependency boundaries;
- architecture validation tools.

Architecture rules should be verified automatically whenever possible.

---

# Final Rule

An import is not just a path.

It is a dependency.

Every dependency should be intentional.
