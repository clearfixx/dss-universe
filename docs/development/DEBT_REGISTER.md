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

| ID       | Priority | Status   | Area                  | Finding                                                                                                    | Proposed owner/package   |
| -------- | -------- | -------- | --------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------ |
| DEBT-001 | Critical | OPEN     | Auth/Users            | Auth imports Users repository/mapper internals and owns user lifecycle decisions.                          | D2–D3                    |
| DEBT-002 | High     | OPEN     | Layering              | Auth and IAM application services access Prisma directly.                                                  | D3                       |
| DEBT-003 | High     | OPEN     | Module boundaries     | Reputation, Achievements, Community Points and Levels depend on broad foreign services.                    | D4                       |
| DEBT-004 | High     | OPEN     | Domain isolation      | Prisma enums/types leak into domain, application and presentation layers.                                  | D4                       |
| DEBT-005 | High     | OPEN     | Architecture tooling  | Boundary checker passes despite known ownership and layering violations.                                   | D2–D4                    |
| DEBT-006 | High     | OPEN     | Roadmap               | Current Position and Project Context are several phases behind the code.                                   | D1                       |
| DEBT-007 | High     | OPEN     | Phase 8               | Delivered packages exist, but Phase 8 remains `IN PROGRESS` without a closure audit.                       | D1                       |
| DEBT-008 | High     | OPEN     | Phase 5               | Auth bridge exists, but custom groups/Premium/security closure is not explicit.                            | D1                       |
| DEBT-009 | Medium   | OPEN     | File Passport         | Preliminary scan reports 247 potentially non-compliant source-like files; classification is required.      | D5                       |
| DEBT-010 | Medium   | OPEN     | Standards             | Older Auth/Authorization and role-based guidance conflicts with newer permission-based boundaries.         | D1–D2                    |
| DEBT-011 | Medium   | OPEN     | Workflow docs         | `phase-workflow.md` contains malformed Markdown fencing.                                                   | D1                       |
| DEBT-012 | High     | ACCEPTED | Environment           | D0 env inventory and local alignment implemented; acceptance awaits the full quality gate.                 | D0                       |
| DEBT-013 | High     | ACCEPTED | Local services        | Mailpit, ClamAV and optional OTLP verified; S3 deferred to DEBT-017, persistent observability not claimed. | D0                       |
| DEBT-014 | Medium   | RESOLVED | Developer tooling     | GitHub CLI installed and authenticated; repository PR and Actions access verified in D0.                   | D0                       |
| DEBT-015 | Medium   | OPEN     | Quality gate          | Root `quality` does not execute every check performed by CI.                                               | D1/D6                    |
| DEBT-016 | Critical | OPEN     | Dependencies          | Audit reports 7 critical and 63 high advisories, including Next.js RCE/SSRF-class findings.                | D0.5                     |
| DEBT-017 | High     | OPEN     | Media/storage         | Media declares MinIO/S3 support, but only local storage is bound and the worker rejects other providers.   | D1/D2 or storage package |
| DEBT-018 | High     | OPEN     | Search                | Phase 10 claims Search integration, but no shared Search Platform or indexing contract was found.          | D1/pre-Phase 11          |
| DEBT-019 | High     | OPEN     | File Passport         | The canonical specification has version/rendering defects and no generated/config/schema classification.   | D1/D5                    |
| DEBT-020 | Critical | OPEN     | Media security        | Windows separators bypass upload-root containment in API storage and two Worker consumers.                 | D0.6                     |
| DEBT-021 | High     | ACCEPTED | Quality orchestration | D0 adds shared-package build ordering; local lint/typecheck pass, clean CI evidence remains required.      | D0/D6                    |
| DEBT-022 | Medium   | OPEN     | Formatting            | Latest repository Prettier check reports 50 non-compliant files (initial audit: 52).                       | D5/D6                    |
| DEBT-023 | Medium   | OPEN     | Worker tests          | Sharp output cleanup fails with `EBUSY` on Windows in the current diagnostic run.                          | D0.6/D6                  |
| DEBT-024 | Critical | OPEN     | IAM/product ownership | Custom groups, delegation, Premium and Guardian membership have no settled implementation owner.           | D1/D2                    |
| DEBT-025 | High     | OPEN     | Roadmap sources       | Legacy phase/milestone files expose a conflicting phase numbering system without superseded markers.       | D1                       |
| DEBT-026 | High     | OPEN     | Completion evidence   | Phase 9/10 completion gates are not currently reproducible from the red repository baseline.               | D1/D6                    |
| DEBT-027 | High     | OPEN     | Public APIs           | Module roots broadly export concrete services and wildcard surfaces, enabling structural coupling.         | D2/D4                    |
| DEBT-028 | High     | OPEN     | Architecture rules    | Approved documents conflict on whether application services may access database services directly.         | D1/D2                    |
| DEBT-029 | High     | ACCEPTED | Worker environment    | D0 adds env loading, template and fail-fast validation; readiness verified, acceptance gate remains red.   | D0                       |
| DEBT-030 | High     | ACCEPTED | Endpoint contract     | D0 aligns Web API/GraphQL defaults and examples to 3001; root/application ownership documented.            | D0                       |
| DEBT-031 | High     | ACCEPTED | Bootstrap             | Node bootstrap verified on Windows with DB alignment guard; existing env files preserved.                  | D0                       |
| DEBT-032 | Medium   | ACCEPTED | Compose               | Dev/test healthchecks verified; original pgAdmin image pinned by digest; acceptance gate remains red.      | D0                       |
| DEBT-033 | Medium   | ACCEPTED | Observability         | Explicit telemetry startup and optional collector verified; no persistent monitoring backend claimed.      | D0                       |

## Additional D0 verification findings

### D0.5 dependency remediation progress

Branch `debt/d0-5-dependencies` reduces DEBT-016 from 7 critical / 63 high /
61 moderate / 9 low to 0 critical / 1 high / 10 moderate / 0 low. It is not
resolved: braces has no available registry patch. The owner-approved narrow
deepmerge-ts 8 override through Prisma configuration passes fresh migrations,
seed, generation and config compatibility checks. No advisory suppression
or risk exception was applied. Evidence and pending gates are recorded in
`docs/audits/D0_5_DEPENDENCY_REMEDIATION_2026-10-10.md`.

### DEBT-034 — Web smoke selectors drift (High, OPEN, D6 / frontend owner)

CI run `38064940272` fails Web smoke; the earlier run's logs explicitly wait
for `getByRole('link', { name: 'Enter Station' })` in `arrival.spec.ts:96`.
The current login/home surface does not expose that legacy entry point.
Impact: browser CI is red despite successful manual dev login. Reconcile
expected user journeys with the frontend owner before changing tests or UI.
No frontend redesign or smoke-test suppression is authorized by D0.

### DEBT-035 — Local test concurrency exhausts memory (Medium, OPEN, D6)

A repeated Web unit-test run with dev processes and Docker services running
crashed multiple Node workers with `NewSpace::EnsureCurrentCapacity` and
`Committing semi space failed` allocation failures. Earlier identical tests
passed. Impact: the default local parallelism is not reliable under this
machine's concurrent workload. Retry with stopped dev processes and
`vitest run --maxWorkers=2`; evaluate a documented resource-aware test policy
in D6. This is not evidence of an assertion failure or a passing full gate.

## Entry policy

Every new entry should include evidence, impact, proposed ownership and a clear
decision before implementation. Discovery is not permission to expand the
current package silently.
