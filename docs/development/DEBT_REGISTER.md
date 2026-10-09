# DSS Universe — Engineering Debt Register

> Status: Active
>
> Updated: 2026-10-10

## Purpose

This document records defects and architectural debt discovered outside the
currently accepted implementation package. Entries are reviewed with the
project owner before implementation unless they are required to keep the
active package safe and buildable.

## Status model

- `OPEN` — confirmed and awaiting decision.
- `ACCEPTED` — approved for a named package.
- `DEFERRED` — intentionally postponed with an owner or target phase.
- `RESOLVED` — implemented and verified.
- `REJECTED` — reviewed and determined not to be debt.

## Register

| ID       | Priority | Status | Area                  | Finding                                                                                                   | Proposed owner/package   |
| -------- | -------- | ------ | --------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------ |
| DEBT-001 | Critical | OPEN   | Auth/Users            | Auth imports Users repository/mapper internals and owns user lifecycle decisions.                         | D2–D3                    |
| DEBT-002 | High     | OPEN   | Layering              | Auth and IAM application services access Prisma directly.                                                 | D3                       |
| DEBT-003 | High     | OPEN   | Module boundaries     | Reputation, Achievements, Community Points and Levels depend on broad foreign services.                   | D4                       |
| DEBT-004 | High     | OPEN   | Domain isolation      | Prisma enums/types leak into domain, application and presentation layers.                                 | D4                       |
| DEBT-005 | High     | OPEN   | Architecture tooling  | Boundary checker passes despite known ownership and layering violations.                                  | D2–D4                    |
| DEBT-006 | High     | OPEN   | Roadmap               | Current Position and Project Context are several phases behind the code.                                  | D1                       |
| DEBT-007 | High     | OPEN   | Phase 8               | Delivered packages exist, but Phase 8 remains `IN PROGRESS` without a closure audit.                      | D1                       |
| DEBT-008 | High     | OPEN   | Phase 5               | Auth bridge exists, but custom groups/Premium/security closure is not explicit.                           | D1                       |
| DEBT-009 | Medium   | OPEN   | File Passport         | Preliminary scan reports 247 potentially non-compliant source-like files; classification is required.     | D5                       |
| DEBT-010 | Medium   | OPEN   | Standards             | Older Auth/Authorization and role-based guidance conflicts with newer permission-based boundaries.        | D1–D2                    |
| DEBT-011 | Medium   | OPEN   | Workflow docs         | `phase-workflow.md` contains malformed Markdown fencing.                                                  | D1                       |
| DEBT-012 | High     | OPEN   | Environment           | Local `.env` files do not contain all keys declared by current examples.                                  | D0                       |
| DEBT-013 | High     | OPEN   | Local services        | MinIO, ClamAV, SMTP catcher and observability backend are absent from Compose and unverified externally.  | D0                       |
| DEBT-014 | Medium   | OPEN   | Developer tooling     | GitHub CLI is unavailable, blocking automated PR and CI inspection.                                       | D0                       |
| DEBT-015 | Medium   | OPEN   | Quality gate          | Root `quality` does not execute every check performed by CI.                                              | D1/D6                    |
| DEBT-016 | Critical | OPEN   | Dependencies          | Audit reports 7 critical and 63 high advisories, including Next.js RCE/SSRF-class findings.               | D0.5                     |
| DEBT-017 | High     | OPEN   | Media/storage         | Media declares MinIO/S3 support, but only local storage is bound and the worker rejects other providers.  | D1/D2 or storage package |
| DEBT-018 | High     | OPEN   | Search                | Phase 10 claims Search integration, but no shared Search Platform or indexing contract was found.         | D1/pre-Phase 11          |
| DEBT-019 | High     | OPEN   | File Passport         | The canonical specification has version/rendering defects and no generated/config/schema classification.  | D1/D5                    |
| DEBT-020 | Critical | OPEN   | Media security        | Windows separators bypass upload-root containment in API storage and two Worker consumers.                | D0.6                     |
| DEBT-021 | High     | OPEN   | Quality orchestration | Clean-checkout lint/typecheck fail until `@dss/editor` is manually built.                                 | D1/D6                    |
| DEBT-022 | Medium   | OPEN   | Formatting            | Repository Prettier check reports 52 non-compliant files.                                                 | D5/D6                    |
| DEBT-023 | Medium   | OPEN   | Worker tests          | Sharp output cleanup fails with `EBUSY` on Windows in the current diagnostic run.                         | D0.6/D6                  |
| DEBT-024 | Critical | OPEN   | IAM/product ownership | Custom groups, delegation, Premium and Guardian membership have no settled implementation owner.          | D1/D2                    |
| DEBT-025 | High     | OPEN   | Roadmap sources       | Legacy phase/milestone files expose a conflicting phase numbering system without superseded markers.      | D1                       |
| DEBT-026 | High     | OPEN   | Completion evidence   | Phase 9/10 completion gates are not currently reproducible from the red repository baseline.              | D1/D6                    |
| DEBT-027 | High     | OPEN   | Public APIs           | Module roots broadly export concrete services and wildcard surfaces, enabling structural coupling.        | D2/D4                    |
| DEBT-028 | High     | OPEN   | Architecture rules    | Approved documents conflict on whether application services may access database services directly.        | D1/D2                    |
| DEBT-029 | High     | OPEN   | Worker environment    | Worker has no env template/schema loading and may start with undefined DB or silently disabled mail.      | D0                       |
| DEBT-030 | High     | OPEN   | Endpoint contract     | Web defaults to API port 4000 while onboarding/API examples use 3001; root uses a third variable name.    | D0                       |
| DEBT-031 | High     | OPEN   | Bootstrap             | Bash-only bootstrap is not Windows-compatible, uses wrong package filters and claims readiness too early. | D0                       |
| DEBT-032 | Medium   | OPEN   | Compose               | Local Compose lacks health checks, isolated test services and deterministic pgAdmin pinning.              | D0                       |
| DEBT-033 | Medium   | OPEN   | Observability         | OpenTelemetry starts without a configured exporter/collector or verified signal delivery.                 | D0                       |

## Entry policy

Every new entry should include evidence, impact, proposed ownership and a clear
decision before implementation. Discovery is not permission to expand the
current package silently.
