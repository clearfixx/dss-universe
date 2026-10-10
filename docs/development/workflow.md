# Development Workflow

> Canonical development lifecycle. Current phase/package rules are in
> [Phase Workflow](phase-workflow.md) and the
> [pre-Phase-11 plan](PRE_PHASE_11_EXECUTION_PLAN.md).

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

## Verification contract

Use exact pinned Node/pnpm and disposable test services. Root `pnpm quality`
is currently a **subset**, not CI parity: it stops on formatting and omits
coverage, generation, migrations, API E2E, GraphQL consistency, Web E2E and audit.
D6 owns executable orchestration repair; D1 documents the gap without suppressing it.

| Gate                  | Command / current CI behavior                                                              |
| --------------------- | ------------------------------------------------------------------------------------------ |
| Install               | `pnpm install --frozen-lockfile`                                                           |
| Format                | `pnpm format:check`; required locally, currently absent from CI                            |
| Architecture/licenses | `pnpm architecture:check`                                                                  |
| Prisma schema/client  | `pnpm db:validate` and `pnpm db:generate`                                                  |
| Migrations            | `pnpm --filter @dss/api db:deploy` against disposable test DB only                         |
| Seed                  | `pnpm --filter @dss/api db:seed` when data acceptance requires it; not currently a CI step |
| Lint/types            | `pnpm lint`, `pnpm typecheck`                                                              |
| Unit/coverage         | `pnpm test:cov`; Turbo builds prerequisite workspace packages                              |
| API E2E               | `pnpm --filter @dss/api test:e2e`                                                          |
| Generated GraphQL     | `pnpm graphql:check` after schema/client readiness                                         |
| Build                 | `pnpm build`; record cached versus fresh outputs                                           |
| Web E2E               | `pnpm --filter @dss/web test:e2e`; CI installs Chromium first                              |
| Dependency security   | `pnpm audit --audit-level high`, `pnpm test:dependency-patches`                            |
| Storage security      | `storage-security.yml`: Windows/Ubuntu keys, API storage, full Worker tests                |

Read `.github/workflows/ci.yml` and `storage-security.yml` for exact environment,
service ports and ordering. CI DB port is 5433; local disposable test Compose uses 5434. Never run migrations against a guessed environment or the dev DB by accident.
Direct app tests may require shared package builds; root Turbo gates supply them.
Fresh-checkout acceptance must not rely on stale dist, generated clients or cache.

Record each command's outcome, not merely a command list. Distinguish implemented,
verified, historically delivered and owner-accepted. Baseline red checks remain
visible with an owned debt entry; no silent skips, ignored advisories or merge.

# Continuous Improvement

The workflow itself is not immutable.

If a better process is discovered, the workflow may evolve through discussion and agreement.

Changes should improve productivity without reducing quality.

---

**Build for years, not for weeks.**
