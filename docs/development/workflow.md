# Development Workflow

> This document defines the standard development lifecycle used throughout DSS Universe.
>
> Every feature, improvement, bug fix, and architectural change follows this workflow.

---

# Purpose

The purpose of this workflow is to ensure that every change is implemented consistently, reviewed properly, documented, and integrated without compromising project quality.

Following the same process for every task keeps the project predictable, maintainable, and scalable.

---

# Development Lifecycle

Every development task follows the same lifecycle.

```text
Mission
    ↓
Discussion
    ↓
Architecture Decision
    ↓
Feature Branch
    ↓
Implementation
    ↓
Testing
    ↓
Documentation Update
    ↓
Review
    ↓
Merge
    ↓
Release
```

Each stage exists for a reason and should not be skipped without good justification.

---

# Mission

Every significant task begins with a clearly defined mission.

A mission should define:

- objective;
- scope;
- expected outcome;
- definition of done.

---

# Discussion

Before implementation begins, ideas are discussed and evaluated.

The goal is to identify potential problems early, before writing code.

---

# Architecture Decision

For significant changes, architecture should be agreed upon before implementation.

Major decisions should be documented using Architecture Decision Records (ADR) when appropriate.

---

# Feature Branch

Development always happens in an isolated feature branch.

The `main` branch is reserved for stable code only.

Branch naming follows the project's Git standards.

---

# Implementation

Implementation focuses on delivering the agreed solution.

During implementation:

- follow engineering standards;
- keep commits focused;
- avoid unrelated changes;
- maintain code quality.

---

# Testing

Every feature should be verified before merging.

Testing may include:

- manual testing;
- automated tests;
- integration tests;
- code review.

---

# Documentation Update

Documentation is part of the implementation.

Before merging:

- update relevant documentation;
- update standards if necessary;
- update ADR if required;
- update release documentation if applicable.

---

# Review

Implementation is reviewed before integration.

The review verifies:

- architecture;
- code quality;
- consistency;
- documentation;
- readiness for merge.

---

# Merge

A feature is merged only after:

- implementation is complete;
- testing passes;
- documentation is updated;
- review is complete.

The `main` branch should always remain deployable.

---

# Release

Completed work becomes part of the next project release.

Release documentation should accurately describe the implemented changes.

---

# Continuous Improvement

The workflow itself is not immutable.

If a better process is discovered, the workflow may evolve through discussion and agreement.

Changes should improve productivity without reducing quality.

---

**Build for years, not for weeks.**
