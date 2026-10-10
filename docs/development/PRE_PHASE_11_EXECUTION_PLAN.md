# DSS Universe — Pre-Phase-11 Debt Closure Plan

> Status: Proposed for owner approval
>
> Prepared: 2026-10-10
>
> Scope: debt closure and Phase 11 readiness only

## Objective

Establish one reproducible, secure and architecturally approved baseline from
which Phase 11 — Knowledge Forge can begin without knowingly forcing a later
rewrite.

This plan does not authorize Phase 11 implementation. The Phase 11 brainstorm,
scope approval and dedicated branch are separate gates.

## Operating rules

1. Each package uses its own branch, review and PR.
2. A package branch starts from the latest accepted baseline, not from an
   unrelated feature branch.
3. No package is merged while its required checks are red.
4. New defects outside package scope go into `DEBT_REGISTER.md`; they are not
   silently absorbed.
5. Every new or materially changed authored source file follows the approved
   DSS File Passport specification.
6. Frontend work is limited to build/test/security compatibility and minimal
   verification behavior. No visual redesign or speculative UX is authorized.
7. Generated files are changed only through their generator.
8. Safe patch/minor dependency changes are allowed after impact review. Major
   upgrades require a separate decision.
9. Migrations and seed operations target disposable development/test databases
   until explicitly promoted.
10. Every architectural deviation receives an ADR or decision-log entry before
    implementation.

## Branch convention

The reserved prefixes are:

- `audit/` for evidence-only audits;
- `debt/` for pre-phase remediation packages;
- `phase/` for approved product phases;
- `hotfix/` for isolated urgent production/security corrections.

Do not use `codex/`.

Planned branches:

```text
debt/d0-environment
debt/d0-5-dependencies
debt/d0-6-storage-security
debt/d1-canonical-documentation
debt/d2-architecture-contracts
debt/d3-auth-identity-boundary
debt/d4-module-boundaries
debt/d5-file-passports
debt/d6-quality-baseline
debt/d7-release-gate
phase/11-knowledge-forge-brainstorm
phase/11-knowledge-forge
```

The current `phase/audit-and-debt-closure` branch predates this finalized
convention. Rename it before push if Git/GitHub tooling is ready; otherwise keep
its history intact and apply the convention from the next branch.

## Model-selection policy

Recommend the model for the next package after reporting the current package's
results, before the owner starts that next task. Do not change models or start
the next package automatically while that choice is pending.

| Work class                                            | Recommended model | Reasoning  |
| ----------------------------------------------------- | ----------------- | ---------- |
| Architecture, security, migrations, ownership         | `gpt-6.1-sol`     | high/xhigh |
| Complex regression diagnosis                          | `gpt-6.1-sol`     | high       |
| Approved configuration and documentation mechanics    | `gpt-6-luna`      | medium     |
| Repetitive Passport insertion or frozen version edits | `gpt-6-luna`      | low/medium |
| Running deterministic gates and collecting results    | `gpt-6-luna`      | low        |

The lower-cost model must escalate when the observed implementation contradicts
the approved design, a migration changes data ownership, or a security boundary
is involved.

## Dependency graph

```text
Audit acceptance
      |
      v
D0 Environment ───────────────┐
      |                        |
      +--> D0.5 Dependencies  |
      |                        +--> D1 Canonical docs/status
      +--> D0.6 Storage sec.  |           |
                               v           v
                         D2 Architecture contracts
                                      |
                                      v
                         D3 Auth/Identity boundary
                                      |
                                      v
                         D4 Module boundaries
                                      |
                                      v
                         D5 File Passports
                                      |
                                      v
                         D6 Full quality baseline
                                      |
                                      v
                         D7 Review / PR / CI gate
                                      |
                                      v
                         Phase 11 brainstorm only
```

D0.5 and D0.6 may be implemented in either order after D0, but both are release
blockers. D1 decision work may begin while D0 is being repaired, but its final
claims require runtime evidence from D0.

## Package schedule

### Gate A — Audit acceptance

Branch: current audit branch.

Deliverables:

- review all audit artifacts and `DEBT_REGISTER.md`;
- confirm Critical/High priority ordering;
- decide whether the audit branch is renamed to `audit/pre-phase-11`;
- push and open the audit PR after GitHub tooling is available.

Exit gate: owner accepts the audit as the planning baseline. Acceptance does
not accept every proposed remediation design automatically.

Recommended model: `gpt-6.1-sol` high for contested findings; `gpt-6-luna` for
PR mechanics.

### D0 — Deterministic environment

Branch: `debt/d0-environment`.

Scope:

- Node 24.18.0 and pnpm 11.9.0 verification;
- healthy Docker Desktop;
- canonical env inventory for API, Worker and Web;
- aligned API/Web ports;
- development and disposable test Compose topology;
- health checks for PostgreSQL and Redis;
- local SMTP catcher and ClamAV;
- explicit optional OTLP topology;
- MinIO decision without claiming unsupported runtime behavior;
- cross-platform truthful bootstrap;
- GitHub CLI installation/auth verification.

Owner decisions before implementation:

- whether MinIO support is required now or Phase 6 wording is narrowed;
- whether local observability is optional-by-profile or mandatory;
- preferred local SMTP catcher and OTLP backend.

Exit gate:

- clean frozen-lockfile install;
- dev/test service health checks;
- migrations and seed on disposable databases;
- API and Worker readiness;
- real SMTP and ClamAV smoke tests;
- onboarding reproduced on Windows.

Model: `gpt-6.1-sol` high for topology; `gpt-6-luna` medium for approved
configuration mechanics.

### D0.5 — Critical dependency remediation

Branch: `debt/d0-5-dependencies`.

Scope:

- classify all 140 advisories by production reachability;
- update Next.js to a release covering the known advisory set;
- apply compatible direct patch/minor updates;
- resolve vulnerable transitives through parent upgrades, narrowly scoped
  overrides or replacement;
- coordinate Web package changes with the active frontend work;
- document any time-bounded exception with owner and expiry.

Exit gate: zero Critical/High advisories, or explicit approved exceptions with
evidence and expiry; full build and affected tests pass.

Model: `gpt-6.1-sol` high for analysis; `gpt-6-luna` medium for frozen edits.

### D0.6 — Storage containment security

Branch: `debt/d0-6-storage-security`.

Scope:

- one platform-correct storage-key containment contract shared by API and
  Worker;
- reject traversal before filesystem/network side effects;
- cover Windows/POSIX separators, absolute paths, sibling prefixes and malformed
  keys;
- repair/reproduce Sharp cleanup reliability;
- keep provider ownership separate from Media business policy.

Exit gate: focused API/Worker security tests pass on Windows and CI, Worker
suite passes, and no storage consumer retains duplicated unsafe validation.

Model: `gpt-6.1-sol` high.

### D1 — Canonical documentation and phase status

Branch: `debt/d1-canonical-documentation`.

Scope:

- reconcile roadmap Current Position and Project Context;
- mark legacy phase/milestone files historical;
- decide Phase 5 group/Premium scope;
- decide Phase 6 provider scope;
- create Phase 8 completion audit;
- create/reconcile Phase 10 completion evidence;
- repair File Passport specification and malformed workflow documentation;
- align local quality-gate documentation with CI.

Owner decisions:

- generic access groups versus narrower IAM Guardian assignment;
- Premium ownership and Phase 14 sanction precedence;
- operational MinIO/S3 requirement;
- shared Search Platform timing;
- accepted historical completion exceptions.

Exit gate: one canonical, internally consistent roadmap and architecture rule
set, with explicit status for Phases 5, 6 and 8.

Model: `gpt-6.1-sol` high/xhigh.

### D2 — Architecture contracts and enforcement design

Branch: `debt/d2-architecture-contracts`.

Scope:

- ADRs for Auth/subject/Users/IAM/Authorization ownership;
- capability port, event, projection and composition-root policy;
- synchronous versus asynchronous integration rules;
- narrow public API rules;
- report-only architecture checker for known violation classes;
- frozen, visible baseline rather than false green status.

Exit gate: representative forbidden fixtures fail checks; existing violations
are baselined and mapped to D3/D4; no production behavior changes yet.

Model: `gpt-6.1-sol` xhigh.

### D3 — Auth, identity, IAM and Authorization remediation

Branch: `debt/d3-auth-identity-boundary`.

Scope:

- remove Users repository/mapper knowledge from Auth;
- put Auth and IAM persistence behind owned contracts/adapters;
- introduce opaque account/subject capability boundaries;
- remove Prisma representation leakage;
- preserve registration, login, sessions, verification, recovery, abuse
  protection, alerts and 2FA behavior;
- use additive/backward-compatible migrations where possible.

Exit gate: boundary checks plus security/unit/integration/E2E tests; migration
apply/rollback strategy reviewed; no secret or profile leakage.

Model: `gpt-6.1-sol` xhigh.

### D4 — Cross-module contract remediation

Branch: `debt/d4-module-boundaries`.

Scope:

- replace broad Users and Community Points service injection;
- use narrow consumer-owned ports, immutable projections or versioned events;
- narrow wildcard/concrete-service exports;
- remove remaining non-infrastructure Prisma leakage;
- promote architecture checks from baseline to enforcement as violations close.

Exit gate: no feature module injects another module's broad service; graph is
cycle-free; integration behavior and event idempotency remain tested.

Model: `gpt-6.1-sol` high/xhigh.

### D5 — File Passport migration and responsibility audit

Branch: `debt/d5-file-passports`.

Scope:

- approve generated/configuration/Prisma inclusion rules;
- protect generated files;
- enforce Passports for changed/new authored files;
- migrate backend modules in reviewable batches;
- coordinate Web files without altering UI/UX;
- split only files whose unrelated responsibilities are confirmed.

Exit gate: reproducible checker, truthful paths/purpose/responsibilities, and no
manual modifications to generated output.

Model: `gpt-6.1-sol` high for semantic review; `gpt-6-luna` medium for approved
mechanical migration.

### D6 — Full quality baseline

Branch: `debt/d6-quality-baseline`.

Scope:

- fix clean-checkout Editor build/type resolution;
- resolve the 52-file formatting baseline without overwriting concurrent work;
- make local full gate equivalent to CI;
- run format, lint, typecheck, Prisma validation/generation, migrations, unit,
  coverage, API E2E, GraphQL consistency, build, architecture/license, Web E2E
  and dependency audit;
- preserve logs/results as completion evidence.

Exit gate: every required command passes from a clean checkout under Node 24
with disposable services.

Model: `gpt-6-luna` low/medium for execution; escalate failures to
`gpt-6.1-sol` high.

### D7 — Baseline release gate

Branch: `debt/d7-release-gate` only if final integration changes are required;
otherwise use the accepted D6 branch/PR.

Scope:

- complete diff, migration, secret and architecture review;
- verify all debt statuses and documentation truthfulness;
- push, open PR and observe CI;
- resolve review findings without scope drift;
- tag/archive audit evidence after merge if project policy requires it.

Exit gate: approved PR, green CI, clean accepted baseline and no unowned
Critical/High debt required before Phase 11.

Model: `gpt-6.1-sol` high for final review; `gpt-6-luna` for mechanics.

## Phase 11 transition

### Brainstorm branch

Create `phase/11-knowledge-forge-brainstorm` only after D7. It contains product
decisions, architecture, threat model, data lifecycle, package breakdown and
acceptance matrix—no feature implementation.

Required decisions include:

- aggregate/revision ownership;
- Guardian capability and protected-page policy;
- draft/review/publish/reject/rollback state machine;
- optimistic concurrency and immutable history;
- Media attachment lifecycle;
- Editor validation and delivery projections;
- comments/reactions/bookmarks integration;
- Search, SEO, Activity and Gamification events;
- deletion, retention and moderation behavior;
- minimum verification UI using existing components only.

Model: `gpt-6.1-sol` xhigh.

### Implementation branch

Create `phase/11-knowledge-forge` only after the brainstorm PR is approved. Each
implementation package must state its model recommendation and pass the full
package Definition of Done before the next package begins.

## Definition of Done for every implementation package

- requested behavior and explicit non-goals are documented;
- ownership and threat model are reviewed;
- source files have truthful Passports;
- format passes;
- lint passes;
- typecheck passes;
- Prisma validates and relevant migrations are tested;
- unit and integration tests pass;
- relevant API/Web E2E passes;
- production build passes;
- architecture and license checks pass;
- dependency audit has no newly introduced unaccepted risk;
- generated output consistency passes;
- documentation and debt register are updated;
- local commit, push, PR and CI are complete.

## Handling roadmap deviations

When a new idea appears during a package:

1. describe the problem and why implementing it now avoids future rework;
2. identify module ownership and affected phases;
3. compare “now”, “later” and “do not implement” options;
4. estimate migration, security and test impact;
5. record the decision;
6. update package scope only after owner approval;
7. keep unrelated defects in the debt register.

The Architecture Guardian should object when an idea creates hidden coupling,
duplicates ownership, weakens security, contradicts an accepted phase contract
or expands frontend design without approved mockups.

## Completion evidence index

The plan is based on:

- `docs/audits/PROJECT_AUDIT_2026-10-10.md`;
- `docs/audits/ARCHITECTURE_BOUNDARY_AUDIT_2026-10-10.md`;
- `docs/audits/ROADMAP_AUDIT_2026-10-10.md`;
- `docs/audits/INFRASTRUCTURE_AUDIT_2026-10-10.md`;
- `docs/audits/QUALITY_AUDIT_2026-10-10.md`;
- `docs/audits/FILE_PASSPORT_AUDIT_2026-10-10.md`;
- `docs/development/DEBT_REGISTER.md`.

This plan becomes active only after owner review.
