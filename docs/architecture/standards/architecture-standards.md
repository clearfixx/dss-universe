# DSS Universe Architecture Standards

> Living document.
>
> This file contains architectural decisions that affect multiple modules of
> DSS Universe.
>
> These standards become part of the platform architecture and should not be
> changed casually.

---

# DSS-ARCH-001

Reserved.

---

# DSS-ARCH-002

Reserved.

---

# DSS-ARCH-003

Reserved.

---

# DSS-ARCH-004

## Repository Update API Standard

### Status

Approved

### Problem

Generic repository methods such as:

- save()
- patch()
- replace()

become ambiguous as the project grows.

It becomes unclear whether they create, update, partially update,
replace, trigger events or perform validation.

### Decision

Repositories must expose explicit persistence operations.

Preferred API:

```ts
create()

find...

updateById()

delete()
```

### Not allowed

```ts
save();

patch();

replace();
```

### Reason

The repository should communicate persistence intent explicitly.

---

# DSS-ARCH-005

## Explicit Mapping Standard

### Status

Approved

### Problem

Passing DTOs or application contracts directly into repositories tightly
couples architectural layers.

### Decision

Application contracts must be mapped explicitly into repository/domain
contracts.

Example

```ts
repository.updateById(id, {
  displayName: profile.displayName,
  bio: profile.bio,
});
```

instead of

```ts
repository.updateById(id, profile);
```

### Mapper Rule

Dedicated mapper classes should only be introduced when transformation
logic becomes sufficiently complex (typically 4–5 fields or more).

---

# DSS-ARCH-006

## Prisma Exception Translation Layer

### Status

Planned

### Problem

Infrastructure-specific exceptions should not leak outside the
Infrastructure layer.

### Planned Solution

```
Prisma
        │
        ▼
Prisma Exception Translator
        │
        ▼
Domain Exceptions
```

Repositories should expose DSS domain exceptions instead of
PrismaClientKnownRequestError.

### Notes

Implementation will begin once several repositories require the same
translation logic.

---

🚀 Build. Share. Grow.
