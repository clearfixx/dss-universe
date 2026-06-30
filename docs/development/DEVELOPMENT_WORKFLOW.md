# DSS Universe • Development Workflow

> Version: 1.0
> Status: Approved
> Applies to: Entire DSS Universe platform

---

# Purpose

This document defines the standard development workflow used in DSS Universe.

The goal is to keep development predictable, maintainable, and architecture-driven.

Code is the result of the process — not the beginning of it.

---

# Development Philosophy

DSS Universe follows one simple principle:

> Think first.
>
> Design second.
>
> Document third.
>
> Code last.

Architecture always comes before implementation.

---

# Standard Workflow

Every significant feature follows the same lifecycle.

```text
Idea
    ↓
Discussion
    ↓
Architecture
    ↓
Documentation
    ↓
Implementation Plan
    ↓
Implementation
    ↓
Testing
    ↓
Git Commit
    ↓
Git Push
    ↓
Documentation Update
    ↓
Architecture Audit
    ↓
Next Phase
```

---

# Phase 1 — Idea

Every feature starts with an idea.

Questions:

- Why does this feature exist?
- Which problem does it solve?
- Does it belong in DSS Universe?
- Is it needed now?

Features should never be implemented simply because they are interesting.

---

# Phase 2 — Architecture Discussion

Before writing code we determine:

- where the feature belongs;
- module boundaries;
- dependencies;
- integration points;
- future scalability.

Large features should never begin with code.

---

# Phase 3 — Documentation

Before implementation we document:

- architecture;
- responsibilities;
- public APIs;
- folder structure;
- future evolution.

Documentation should describe the intention before implementation begins.

---

# Phase 4 — Implementation Planning

Implementation is divided into small, reviewable packages.

Each package should have:

- clear goal;
- predictable outcome;
- limited scope.

Large changes should not be implemented as one giant commit.

---

# Phase 5 — Implementation

Only after planning begins the implementation.

General rules:

- small commits;
- readable code;
- architecture first;
- consistency over cleverness.

---

# Phase 6 — Testing

Every completed package should be verified.

Examples:

- build;
- lint;
- unit tests;
- integration tests;
- manual verification.

Broken builds should never be committed.

---

# Phase 7 — Git

After successful verification:

```bash
git add -A

git commit

git push
```

Every commit should represent a meaningful architectural step.

---

# Phase 8 — Documentation Update

After implementation:

Update documentation if necessary.

Examples:

- Version History
- Architecture
- Module documentation
- Roadmap

Code and documentation should evolve together.

---

# Phase 9 — Architecture Audit

After every major package:

Review:

- architecture;
- dependencies;
- folder structure;
- public APIs;
- technical debt;
- documentation consistency.

The goal is to detect architectural drift early.

---

# Development Rules

During development:

Prefer:

- small iterations;
- architecture discussions;
- reusable abstractions;
- explicit decisions.

Avoid:

- large unreviewed changes;
- architectural shortcuts;
- duplicated code;
- premature abstractions.

---

# Architecture Before Code

Whenever implementing something significant, ask:

1. Where does it belong?
2. Does something similar already exist?
3. Will this design still make sense in two years?

Only then start writing code.

---

# Architecture Freeze

Once a foundation has been approved, it should remain stable.

Architecture should evolve only through deliberate decisions.

Avoid unnecessary structural refactoring.

---

# Reference Implementation

The Users module serves as the reference implementation of the DSS backend architecture.

New modules should follow its structure unless an approved architectural decision states otherwise.

---

# Continuous Improvement

Improvement is encouraged.

Random change is not.

Every architectural improvement should:

- solve a real problem;
- be documented;
- be reviewed;
- improve long-term maintainability.

---

# Final Principle

We are not writing code.

We are building a platform.

Every decision should make the platform easier to understand, easier to extend, and easier to maintain.
