# DSS Universe Engineering Guide

Version: 1.0

This document defines the engineering principles, coding standards, architecture rules and development workflow for the DSS Universe project.

---

# 1. Coding Standards

## Imports

### Rule

Do not use long relative imports.

Bad:

```ts
import { PrismaService } from "../../../database/services/prisma.service";
```

Good:

```ts
import { PrismaService } from "@api/database";
```

Public APIs are always imported through barrel files.

---

## Barrel Files

Every public module exposes an `index.ts`.

Only export the public API.

Internal implementation must stay internal.

---

## Folder Naming

Folders describe domains.

Good:

```text
pagination/
transactions/
uploads/
validation/
security/
storage/
```

Bad:

```text
helpers/
utils/
common/
misc/
```

---

## Module Organization

If a folder contains more than 2–3 files, it becomes its own module.

Example:

```text
pagination/

    pagination.helper.ts
    pagination.types.ts
    pagination.constants.ts
    index.ts
```

---

## File Naming

Use explicit filenames.

Good:

```text
pagination.helper.ts
pagination.types.ts
database.constants.ts
```

Avoid generic names like:

```text
helper.ts
utils.ts
misc.ts
```

---

## Public API

Never import internal implementation from another module.

Good:

```ts
import { PrismaService } from "@api/database";
```

Bad:

```ts
import { PrismaService } from "@api/database/services/prisma.service";
```

---

# 2. Architecture Standards

## Rule Zero

Before introducing a new architectural solution ask:

> Will this make the project easier to maintain one year from now?

If the answer is **No**, do not introduce it.

---

## Infrastructure First

Infrastructure should be completed before business modules are implemented.

Examples:

- configuration
- database
- logging
- health
- exceptions

---

## Prefer Simplicity

Avoid unnecessary abstractions.

Examples we intentionally avoid:

- Repository Pattern over Prisma
- ORM wrappers
- Fake generic repositories

Infrastructure should solve real problems, not theoretical ones.

---

## Domain Driven Structure

Top-level folders should represent business domains.

Example:

```text
database/
auth/
forum/
academy/
cms/
users/
```

Not implementation types.

---

## Freeze Policy

Once a module passes Architecture Review it becomes:

```text
Frozen v1.x
```

After that:

- no structural refactoring
- no folder redesign
- no unnecessary renaming

unless:

- bug
- new requirements
- dependency changes

---

# 3. Development Process

## Workflow

Every significant task follows the same lifecycle.

```text
Plan
    ↓
Build
    ↓
Test
    ↓
Architecture Review
    ↓
Refactor (if justified)
    ↓
Freeze
    ↓
Next
```

---

## Architecture Review

Every completed milestone answers four questions.

### Does it work?

The implementation is tested.

---

### Will it scale?

Think about the project one year from now.

---

### Does it follow Engineering Guide?

Review:

- folder structure
- aliases
- naming
- module boundaries
- dependency direction

---

### Would we like to maintain this code in one year?

If the answer is "No":

Refactor once.

If the answer is "Yes":

Freeze the module.

---

## Refactoring Policy

Refactoring is encouraged.

But it must solve a real problem.

Examples:

- remove technical debt
- simplify architecture
- improve scalability
- remove duplication

Never refactor only because a different solution exists.

---

## Refactor Limit

One Architecture Review should introduce at most **one significant architectural refactor**.

Additional ideas go into the architecture backlog.

Avoid endless redesign loops.

---

## Discussion Budget

Target ratio:

```text
Discussion ≤ 10%

Development ≥ 90%
```

Architecture supports development.

Architecture never replaces development.

---

# Engineering Philosophy

We optimize for:

- consistency
- readability
- simplicity
- scalability
- maintainability

We do not optimize for:

- clever code
- unnecessary abstractions
- premature optimization
- architecture for architecture's sake

The goal is simple:

> Build software that is still enjoyable to maintain years later.
