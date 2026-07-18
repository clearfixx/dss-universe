# Repository Design Guidelines

## Philosophy

Repositories are persistence adapters.

They are **not** business services.

---

## Repository Responsibilities

Repositories may:

- read data;
- write data;
- delete data;
- perform persistence-specific mapping.

Repositories must not:

- validate business rules;
- make authorization decisions;
- emit business events;
- contain HTTP logic.

---

## Preferred API

```ts
create()

find...

updateById()

delete()
```

---

## Avoid

```ts
save();

patch();

replace();
```

---

## Dependency Direction

```
Controller

↓

Service

↓

Repository Interface

↓

Infrastructure Repository

↓

Database
```

---

Repositories should never depend on controllers or services.

---

🚀 Build. Share. Grow.
