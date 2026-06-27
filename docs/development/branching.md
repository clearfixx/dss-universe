# Branching Strategy

> This document defines the Git branching strategy used by DSS Universe.
>
> Its purpose is to keep development organized, maintain a stable main branch, and provide a predictable workflow for every feature.

---

# Purpose

The branching strategy ensures that:

- the `main` branch always contains stable code;
- new development is isolated;
- unfinished work never affects production-ready code;
- every feature has a clear lifecycle.

---

# Main Branch

The `main` branch is the project's primary integration branch.

Rules:

- always stable;
- always deployable;
- no experimental code;
- no direct development;
- no unfinished features.

Direct commits to `main` should be avoided.

---

# Feature Branches

Every new feature is developed in its own branch.

Examples:

```text
feature/authentication
feature/authorization
feature/template-engine
feature/comments
feature/engineering-handbook
```

A feature branch represents one mission.

---

# Branch Lifecycle

Every feature follows the same lifecycle.

```text
main
    │
    ├───────────────┐
    │               │
    ▼               │
feature/...         │
    │               │
Implementation      │
    │               │
Testing             │
    │               │
Documentation       │
    │               │
Review              │
    │               │
    └──────────────►│
                    ▼
                  main
```

A feature branch should remain focused on a single objective.

---

# Starting a Feature

Before creating a branch:

- ensure `main` is up to date;
- pull the latest changes;
- define the mission.

Example:

```bash
git checkout main
git pull
git checkout -b feature/example-feature
```

---

# Working in a Feature Branch

While working:

- commit frequently;
- keep commits focused;
- avoid unrelated changes;
- follow engineering standards;
- keep documentation updated.

---

# Ready for Merge

A branch is ready to merge only when:

- implementation is complete;
- testing is finished;
- documentation is updated;
- review is complete;
- the Definition of Done is satisfied.

---

# Merging

Features are merged into `main` after successful review.

After merging:

- push `main`;
- delete the completed feature branch;
- start the next mission from an updated `main`.

---

# Hotfixes

Critical production fixes may use dedicated branches.

Example:

```text
hotfix/login-error
```

Hotfixes follow the same quality standards as regular features.

---

# Future Branch Types

The project currently uses only:

```text
main
feature/*
hotfix/*
```

Additional branch types may be introduced if the project grows.

---

# Branch Naming

Branch names should:

- use lowercase;
- use hyphens instead of spaces;
- describe the objective;
- remain concise.

Examples:

```text
feature/user-profile
feature/forum
feature/wiki
feature/template-engine

hotfix/auth-login

docs/release-process
```

---

# Branch Philosophy

Branches exist to isolate change.

A branch should represent one mission, one objective, and one coherent piece of work.

Small, focused branches are easier to review, test, document, and merge.

---

**Build for years, not for weeks.**
