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

| ID       | Priority | Status   | Area                  | Finding                                                                                                              | Proposed owner/package |
| -------- | -------- | -------- | --------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| DEBT-001 | Critical | OPEN     | Auth/Users            | Auth imports Users repository/mapper internals and owns user lifecycle decisions.                                    | D2–D3                  |
| DEBT-002 | High     | OPEN     | Layering              | Auth and IAM application services access Prisma directly.                                                            | D3                     |
| DEBT-003 | High     | OPEN     | Module boundaries     | Reputation, Achievements, Community Points and Levels depend on broad foreign services.                              | D4                     |
| DEBT-004 | High     | OPEN     | Domain isolation      | Prisma enums/types leak into domain, application and presentation layers.                                            | D4                     |
| DEBT-005 | High     | OPEN     | Architecture tooling  | Boundary checker passes despite known ownership and layering violations.                                             | D2–D4                  |
| DEBT-006 | High     | ACCEPTED | Roadmap               | Current Position and Project Context reconciled in D1; owner PR review pending.                                      | D1                     |
| DEBT-007 | High     | ACCEPTED | Phase 8               | Phase 8 classified implemented with completion audit; runtime/owner acceptance remains pending.                      | D1/D6                  |
| DEBT-008 | High     | OPEN     | Phase 5               | Auth bridge exists; groups/Premium ownership approved, implementation awaits separately scoped package.              | D3.5 / D6              |
| DEBT-009 | Medium   | OPEN     | File Passport         | Preliminary scan reports 247 potentially non-compliant source-like files; classification is required.                | D5                     |
| DEBT-010 | Medium   | OPEN     | Standards             | Older Auth/Authorization and role-based guidance conflicts with newer permission-based boundaries.                   | D1–D2                  |
| DEBT-011 | Medium   | ACCEPTED | Workflow docs         | Canonical phase/workflow fencing repaired in D1; documentation checks pass, review pending.                          | D1                     |
| DEBT-012 | High     | ACCEPTED | Environment           | D0 env inventory and local alignment implemented; acceptance awaits the full quality gate.                           | D0                     |
| DEBT-013 | High     | ACCEPTED | Local services        | Mailpit, ClamAV and optional OTLP verified; S3 deferred to DEBT-017, persistent observability not claimed.           | D0                     |
| DEBT-014 | Medium   | RESOLVED | Developer tooling     | GitHub CLI installed and authenticated; repository PR and Actions access verified in D0.                             | D0                     |
| DEBT-015 | Medium   | OPEN     | Quality gate          | Root `quality` does not execute every check performed by CI.                                                         | D1/D6                  |
| DEBT-016 | Critical | OPEN     | Dependencies          | Audit now 0 critical / 1 high / 10 moderate; braces local mitigation is not an accepted audit exception.             | D0.5/D6                |
| DEBT-017 | High     | DEFERRED | Media/storage         | LOCAL scope approved; operational MinIO/S3 adapters absent, separate debt not blocking Phase 11.                     | Storage package        |
| DEBT-018 | High     | DEFERRED | Search                | News-local search clarified; shared Search/indexing contract remains future work, not Phase 11 prerequisite.         | D2/future Search       |
| DEBT-019 | High     | ACCEPTED | File Passport         | Passport v3.1 rendering repaired in D1; generated/config/schema classification remains D5 work.                      | D1/D5                  |
| DEBT-020 | Critical | OPEN     | Media security        | Windows separators bypass upload-root containment in API storage and two Worker consumers.                           | D0.6                   |
| DEBT-021 | High     | ACCEPTED | Quality orchestration | D0 adds shared-package build ordering; local lint/typecheck pass, clean CI evidence remains required.                | D0/D6                  |
| DEBT-022 | Medium   | OPEN     | Formatting            | D2 repository Prettier check reports 41 legacy non-compliant files (initial audit: 52).                              | D5/D6                  |
| DEBT-023 | Medium   | OPEN     | Worker tests          | Sharp output cleanup fails with `EBUSY` on Windows in the current diagnostic run.                                    | D0.6/D6                |
| DEBT-024 | Critical | OPEN     | IAM/product ownership | IAM assignment/Authorization decisions/Guardian capability ownership approved; groups/Premium implementation absent. | D3.5 scope approval    |
| DEBT-025 | High     | ACCEPTED | Roadmap sources       | Legacy phases/milestones marked historical and linked to canonical roadmap; review pending.                          | D1                     |
| DEBT-026 | High     | OPEN     | Completion evidence   | Phase 9/10 completion gates are not currently reproducible from the red repository baseline.                         | D1/D6                  |
| DEBT-027 | High     | OPEN     | Public APIs           | Module roots broadly export concrete services and wildcard surfaces, enabling structural coupling.                   | D2/D4                  |
| DEBT-028 | High     | OPEN     | Architecture rules    | Approved documents conflict on whether application services may access database services directly.                   | D1/D2                  |
| DEBT-029 | High     | ACCEPTED | Worker environment    | D0 adds env loading, template and fail-fast validation; readiness verified, acceptance gate remains red.             | D0                     |
| DEBT-030 | High     | ACCEPTED | Endpoint contract     | D0 aligns Web API/GraphQL defaults and examples to 3001; root/application ownership documented.                      | D0                     |
| DEBT-031 | High     | ACCEPTED | Bootstrap             | Node bootstrap verified on Windows with DB alignment guard; existing env files preserved.                            | D0                     |
| DEBT-032 | Medium   | ACCEPTED | Compose               | Dev/test healthchecks verified; original pgAdmin image pinned by digest; acceptance gate remains red.                | D0                     |
| DEBT-033 | Medium   | ACCEPTED | Observability         | Explicit telemetry startup and optional collector verified; no persistent monitoring backend claimed.                | D0                     |

## Additional D0 verification findings

### D2 architecture contracts and inventory

[ADR-003](../architecture/adr/003-subject-and-access-ownership.md) records the explicit
owner approval: Auth owns opaque subject/credentials, Users owns profiles, separate
composition coordinates registration and response assembly. No D2 production or
schema change implements this yet; DEBT-001/002/004/027 remain OPEN.
[ADR-004](../architecture/adr/004-module-integration-contracts.md) describes synchronous
security ports, Outbox events, minimized projections and named public APIs for review.

The [frozen report-only inventory](../architecture/ARCHITECTURE_TOOLING.md) contains
156 diagnostics: 20 allocated to D3, 136 to D4. It exposes wildcard/concrete public
exports, foreign internals/services and persistence leaks, without waiving them.
DEBT-005 enforcement remains OPEN until D4; a baseline match is not compliance.
DEBT-010/028 documentation direction is reconciled; runtime/manual review remains.
DEBT-024 requires a separate D3.5 IAM groups/Premium scope approval and package,
scheduled after D3 and before final D6/D7 readiness. No implementation authorization
or Phase 14 sanction completion is implied. DEBT-037 remains an unresolved physical
storage threat-model decision, not a promise of sandbox isolation.

The current formatting count after D2 is 41 legacy files (43 after D1, 50 after
D0.6). Two touched historical ADRs were formatted while marking their status;
D2 does not mechanically reformat unrelated source.

### D1 documentation reconciliation

Owner-approved scope decisions are in `docs/development/D1_SCOPE_DECISIONS.md`.
Documentation remediation is recorded in
`docs/audits/D1_CANONICAL_DOCUMENTATION_2026-10-10.md`.
ACCEPTED entries below/above identify the named remediation package, not permission
to merge red checks or a claim of owner-reviewed completion. Historical findings
remain audit evidence; current outcomes are qualified in package reports.

### D0.5 dependency remediation progress

Branch `debt/d0-5-dependencies` reduces DEBT-016 from 7 critical / 63 high /
61 moderate / 9 low to 0 critical / 1 high / 10 moderate / 0 low. It is not
resolved: braces has no available registry patch. The owner-approved narrow
deepmerge-ts 8 override through Prisma configuration passes fresh migrations,
seed, generation and config compatibility checks. No advisory suppression
or risk exception was applied. Evidence and pending gates are recorded in
`docs/audits/D0_5_DEPENDENCY_REMEDIATION_2026-10-10.md`.

The approved braces local depth-guard patch passes 14 regression tests and
300 differential comparisons. This is a mitigation pending review, not an
accepted audit exception; DEBT-016 remains OPEN and security CI stays strict.

### DEBT-036 — Upstream braces expansion error (Low, OPEN, D6)

Differential compatibility review finds pristine braces 3.0.3 and the patched
copy both throw TypeError for expansion of some parenthesized patterns such
as `src/a/(a|b).ts`. This is separate from depth exhaustion; the patch preserves
the upstream result/error behavior. No affected application path is established.
Review supported pattern policy if such expansion is introduced; do not silently
absorb an upstream behavior rewrite into D0.5.

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

### D0.6 containment remediation progress

DEBT-020 and DEBT-023 have fixes on `debt/d0-6-storage-security`;
focused Windows/Ubuntu CI run `38077108683` passes. Owner acceptance remains pending
and the entries are not marked resolved before review. API and both Worker
consumers share `@dss/storage`; variant validation precedes filesystem effects.
Sharp metadata inspection is buffer-backed in tests; production caching is unchanged.
Evidence: `docs/audits/D0_6_STORAGE_SECURITY_2026-10-10.md`.

### DEBT-037 — Physical storage containment threat model (Medium, OPEN, D2/D6)

Lexical key validation cannot prevent a pre-existing symlink/junction or a local
filesystem race from redirecting IO outside uploads. D0.6 assumes directories are
application-controlled. There is no established remote exploit under this assumption.
Decide whether hostile local writers are in scope; if so, design OS-specific physical
containment and TOCTOU defenses. Do not silently expand this package or describe
lexical checks as sandbox isolation.

Every new entry should include evidence, impact, proposed ownership and a clear
decision before implementation. Discovery is not permission to expand the
current package silently.
