# DSS Universe — Project Audit

> Status: Static audit in progress; runtime verification blocked
>
> Date: 2026-10-10
>
> Branch: `phase/audit-and-debt-closure`

## Purpose

This audit establishes a truthful baseline before DSS Universe begins Phase 11.
It compares the canonical roadmap, architecture rules, repository structure,
module boundaries, development environment, quality gates and implemented code.

The audit does not authorize Phase 11 implementation. Phase 11 begins only
after the debt-closure scope is reviewed and accepted.

## Model recommendation

Architecture reconciliation, boundary redesign and phase planning should use
`gpt-6.1-sol` with high or xhigh reasoning. Mechanical documentation cleanup,
File Passport insertion and routine test additions may use a lower-cost model
after the architectural decisions are frozen.

## Audit rules

- Backend and architecture are the current priority.
- Frontend changes are limited to the smallest verification surface required
  by a backend capability.
- No new visual design, complex UI/UX or speculative frontend behavior is in
  scope.
- Every new source file follows DSS File Passport v3.0/v3.1.
- One file owns one coherent responsibility.
- Modules must not import another module's internals or persistence adapters.
- Sensitive state must not cross a module boundary without an explicit,
  minimal and reviewed contract.
- Defects outside the accepted package are recorded in the debt register and
  reported before they are implemented.

## Repository position

The implemented repository is materially ahead of its status documentation.

- Phases 1–7 are represented as complete by the canonical roadmap.
- Phase 8 contains delivered Reputation, Community Points, Levels, Custom
  Titles, Achievements, Leaderboards and frontend packages, but remains marked
  `IN PROGRESS`.
- Phase 9 has a completion audit and is marked complete.
- Phase 10 packages 10.0–10.16 are marked complete.
- The post-Phase-10 Auth UX bridge includes session UX, password recovery,
  email verification, login abuse protection, security alerts, safe unlock and
  two-factor authentication.
- Phase 11 has not started and remains the next product phase after debt
  closure.

The `Current Position` section in the canonical roadmap still points to Phase 4. `PROJECT_CONTEXT.md` still reports Phase 3/5-era state. These sections are
not reliable descriptions of the current repository.

## Environment baseline

| Capability            | Current state                                                 | Required action                                                |
| --------------------- | ------------------------------------------------------------- | -------------------------------------------------------------- |
| Node.js               | 22.22.3                                                       | Install/use pinned 24.18.0                                     |
| pnpm                  | Pinned 11.9.0, Corepack requires network in the current shell | Revalidate under Node 24                                       |
| Docker Desktop        | Installed, engine previously stuck in `starting`              | Repair and run Compose health checks                           |
| PostgreSQL            | Declared in Compose                                           | Runtime verification pending                                   |
| Redis                 | Declared in Compose                                           | Runtime verification pending                                   |
| pgAdmin               | Declared in Compose                                           | Runtime verification pending                                   |
| MinIO/S3              | Not declared in Compose                                       | Decide local MinIO topology or verify an external endpoint     |
| ClamAV                | Not declared in Compose                                       | Add/verify a development scanner service                       |
| SMTP                  | Not declared in Compose                                       | Add a local mail catcher or verify a development SMTP endpoint |
| Observability backend | Not declared in Compose                                       | Define optional local OTLP backend and fallback behavior       |
| GitHub CLI            | Missing from PATH                                             | Install and authenticate before automated PR/CI work           |
| Git remote            | Read access verified with `git ls-remote`                     | Write and PR access remain unverified                          |
| Root `.env`           | Exists but misses many keys from `.env.example`               | Reconcile without exposing secret values                       |
| API `.env`            | Exists but misses newer Auth/AI/Mail keys                     | Reconcile without exposing secret values                       |

The current Compose file contains only `postgres`, `redis` and `pgadmin`.

The Worker has no environment template or validation path, Web defaults to API
port 4000 while onboarding uses 3001, and the Bash-only bootstrap uses the wrong
pnpm filter name. Compose also lacks health checks and an isolated local test
topology. Detailed evidence is in
`docs/audits/INFRASTRUCTURE_AUDIT_2026-10-10.md`.

## Architecture findings

### A1 — Authentication is coupled to Users internals

`AuthService` imports the Users repository contract and mapper through internal
paths. Auth application services also read or update user-owned persistence
directly. The JWT strategy reads Prisma `UserStatus` through the Session/User
relationship.

This violates the intended ownership boundary. Authentication should operate
on an opaque subject/account credential contract and session state. Public
profile, social data and Users persistence must not be visible to Auth.

The redesign must distinguish:

- credentials and authenticators;
- opaque subject identity;
- account lifecycle eligibility;
- public/private profile data;
- authorization permissions.

Registration may require an explicit orchestration boundary. It must not be
implemented by allowing Auth to own the Users aggregate.

### A2 — Application services bypass repository boundaries

Several Auth application services inject `PrismaService` directly. IAM role,
permission and user-access services also contain direct persistence logic.
This contradicts the documented flow `application -> repository contract ->
infrastructure adapter`.

### A3 — Cross-module synchronous service coupling

Reputation, Achievements, Community Points and Levels import `UsersService`.
Levels also imports `CommunityPointsService`.

Not every cross-module interaction can be asynchronous, but dependencies must
be expressed as narrow ports, immutable projections or events rather than
general-purpose foreign services. A module may know a stable capability
contract; it must not know another module's internals, database model or
unrelated data.

### A4 — Architecture validation is too narrow

The current checker catches domain-to-outer-layer imports, presentation access
to Prisma/repositories and imports of another module's infrastructure folder.
It does not catch:

- module-to-module service coupling;
- application-layer Prisma access;
- Prisma enums/types leaking into domain and presentation;
- deep imports of another module's domain/application files;
- missing public API boundaries;
- Auth/Users ownership violations;
- DSS File Passport coverage.

The current checker passes despite the confirmed violations above.

### A5 — Prisma types leak beyond infrastructure

Prisma enums and types are imported by domain, application and presentation
files in multiple modules. Domain contracts should use module-owned enums and
types. Infrastructure mappers should translate Prisma representations.

### A6 — File Passport adoption is incomplete

A preliminary scan found 247 files without `DSS Universe` in their first 35
lines out of 786 TS/TSX/module-JS source candidates. Including the Prisma schema
produces 248 of 787, but the specification does not clearly classify `.prisma`.
Generated, framework and configuration files must also be classified before
remediation. Detailed evidence is recorded in
`docs/audits/FILE_PASSPORT_AUDIT_2026-10-10.md`.

New authored source files must comply immediately. Existing files should be
migrated in bounded packages rather than through an unreviewable repository-
wide comment rewrite.

The canonical specification is itself inconsistent: it identifies as v3.0,
appends v3.1 separately, contains an unclosed Official Template code fence and
does not define generated/configuration/schema exclusions.

### A7 — Standards contain conflicting rules

Older backend standards place authentication and authorization together in
`core/auth` and show role-based decorators. Newer documents separate Auth,
Authorization and IAM and require permission-based checks. The canonical rule
must be reconciled before architecture enforcement is expanded.

### A8 — Storage portability is declared but not implemented

Media configuration exposes local, MinIO and S3 provider choices, but the
runtime binds only the local storage provider. The media worker explicitly
rejects non-local providers. This is a contract-to-implementation mismatch,
not merely an unavailable local service.

### A9 — Public module APIs expose broad concrete services

Many module roots export application services directly, and several use
unrestricted wildcard exports. This turns nominal public boundaries into broad
coupling surfaces. Detailed dependency, Prisma-leak and checker evidence is in
`docs/audits/ARCHITECTURE_BOUNDARY_AUDIT_2026-10-10.md`.

## Product and roadmap findings

### R1 — Phase status is not truthful

The roadmap's lower `Current Position` section and `PROJECT_CONTEXT.md` are
stale. Phase 8 is still `IN PROGRESS` while Phases 9 and 10 are complete.

### R2 — Phase 5 is not formally closed

The Auth UX bridge is substantially implemented, but custom access groups,
allow-listed delegation, Premium ownership and the full security baseline lack
one explicit closure decision.

### R3 — Phase 8 lacks a closure audit

The major Phase 8 packages exist. A dedicated acceptance matrix must determine
whether the remaining status is documentation debt or missing behavior.

### R4 — Phase 11 must not start on an ambiguous baseline

Knowledge Forge depends on Editor, Media, Interactions, Activity,
Gamification, Search, Audit and Outbox. Its architecture brainstorm must happen
after ownership and infrastructure debt that can force later rewrites is
resolved.

### R5 — Search Platform claims exceed the implementation evidence

Phase 10 documentation describes Search integration, but the repository shows
only a News-local search projection. No dedicated shared Search Platform
module or cross-module indexing contract was found. Phase 10 wording must be
corrected or the missing platform boundary must be scheduled explicitly.

### R6 — Custom groups and Premium have no settled phase owner

Phase 5 requires custom access groups and allow-listed delegation. Phase 7
defers groups to Phase 8, but Phase 8 implements gamification rather than IAM
groups. Phase 9 defers Premium override enforcement to Phase 14. Knowledge
Forge Guardians are needed by Phase 11, so this ownership gap must be resolved
before implementation. The full phase matrix is recorded in
`docs/audits/ROADMAP_AUDIT_2026-10-10.md`.

### R7 — Legacy phase documents look authoritative

`docs/roadmap/phases.md` and `docs/roadmap/milestones.md` retain an obsolete
Phase 0–4 model without a superseded marker. They conflict with the canonical
25-phase roadmap and must be archived or labeled historical.

## Quality-gate findings

CI currently checks architecture/license rules, Prisma, lint, typecheck,
coverage, API E2E, GraphQL generated output, build, Web E2E and high-severity
dependency audit.

The root `quality` command is not equivalent to CI: it omits API E2E, Web E2E,
GraphQL consistency and explicit coverage. A canonical local full-gate command
or documented command sequence is required.

Runtime quality status is not yet verified because the pinned Node version and
working Docker services are unavailable.

The available Node 22 diagnostic run found that repository formatting fails on
52 files and root tests fail in the Worker (20 passed, 3 failed). It also proved
that clean-checkout lint and typecheck require a manual `@dss/editor` build;
both pass after that build. Production build, Prisma validation and the current
architecture/license scripts pass under Node 22. Full command evidence is in
`docs/audits/QUALITY_AUDIT_2026-10-10.md`.

Local storage path-containment checks are unsafe on Windows because the API and
Worker test only the `../` separator form while `path.relative()` returns
`..\\`. An escaping storage key can therefore proceed to filesystem, ClamAV or
processing work instead of being rejected. This is a Critical security defect.

The dependency audit currently reports 140 advisories: 7 critical, 63 high,
61 moderate and 9 low. Critical findings include multiple Next.js advisories,
`proxy-addr`, `handlebars` and `shell-quote`. Production-impacting high findings
also include Sharp, Joi, Multer, Undici, `ws`, ProseMirror and GraphQL tooling.
The Next.js advisory set requires at least 16.3.8 for the currently reported
issues. Frontend dependency remediation must be coordinated with the active
frontend work, but security remediation cannot be deferred as visual polish.

## Proposed debt-closure sequence

### Package D0 — Environment and deterministic onboarding

- install/select Node 24.18.0 and pnpm 11.9.0;
- repair Docker Desktop;
- reconcile local environment files by key;
- add or explicitly design local MinIO, ClamAV, SMTP catcher and optional OTLP;
- provision disposable development and test databases;
- install/authenticate GitHub CLI;
- prove clean install and documented startup.

Recommended model: lower-cost model for configuration mechanics; use
`gpt-6.1-sol` if Docker/service topology requires architectural changes.

### Package D0.5 — Critical dependency remediation

- classify production and development advisories by reachable impact;
- update Next.js to at least 16.3.8 and apply safe direct patch/minor updates
  such as Sharp and Joi where compatibility is verified;
- determine whether vulnerable transitive packages require parent upgrades,
  overrides or replacement;
- run the complete quality gate and focused security regression tests;
- reach zero critical/high advisories or document a time-bound exception with
  evidence, owner and expiry.

Recommended model: `gpt-6.1-sol` high for impact analysis and upgrade planning;
use a lower-cost model for frozen version edits and routine verification.

### Package D0.6 — Worker path-containment security fix

- define one narrow, platform-correct storage-key resolver;
- replace duplicated scanner/processor containment logic;
- cover Windows and POSIX separators, absolute paths and sibling-prefix cases;
- ensure invalid paths fail before network or filesystem side effects;
- rerun Worker unit tests under Node 24 on Windows and CI.

Recommended model: `gpt-6.1-sol` high because this is a security boundary.

### Package D1 — Canonical documentation and status reconciliation

- update roadmap Current Position;
- update Project Context;
- audit and close or defer Phase 5 scope explicitly;
- create the Phase 8 completion audit;
- repair malformed or conflicting workflow/standards documents;
- define the branch convention for all future phases.

Recommended model: `gpt-6.1-sol` high because status decisions affect scope and
architecture.

### Package D2 — Architecture enforcement design

- freeze Auth, identity/account, Users, IAM and Authorization ownership;
- define permitted synchronous ports and event/projection boundaries;
- update architecture documents and ADRs;
- expand the checker only after the canonical rules are approved.

Recommended model: `gpt-6.1-sol` xhigh.

### Package D3 — Auth/Users/IAM boundary remediation

- remove Users internals from Auth;
- move direct Prisma access behind owned repositories;
- separate credential/session data from user profile data;
- preserve external API behavior and migrations where possible;
- add boundary, security and regression tests.

Recommended model: `gpt-6.1-sol` xhigh.

### Package D4 — Cross-module contract remediation

- replace broad `UsersService` and `CommunityPointsService` dependencies with
  narrow ports, projections or event consumers;
- remove Prisma representation leakage from domain/application/presentation;
- strengthen public module APIs and architecture tests.

Recommended model: `gpt-6.1-sol` high or xhigh.

### Package D5 — File Passport and file-responsibility audit

- classify authored, generated, configuration and vendor-like files;
- enforce Passports for new authored files;
- migrate missing Passports by module in reviewable packages;
- split files that contain unrelated responsibilities;
- avoid changing generated files manually.

Recommended model: lower-cost model after classification rules are frozen.

### Package D6 — Full baseline quality gate

- format check;
- lint;
- typecheck;
- Prisma validation and generation;
- unit and coverage suites;
- API E2E;
- GraphQL consistency;
- production build;
- architecture and license checks;
- Web smoke/E2E without visual redesign;
- dependency audit.

Recommended model: lower-cost model for routine execution; escalate to
`gpt-6.1-sol` for non-trivial failures.

### Package D7 — Debt-phase review and release gate

- review the full diff and migrations;
- verify documentation truthfulness;
- commit each accepted package;
- push the phase branch;
- open a PR and observe CI;
- merge only after user review and successful checks.

## Phase 11 entry criteria

Phase 11 may begin when:

1. the environment and disposable databases are reproducible;
2. critical and high dependency findings are remediated or accepted with
   evidence, an owner and an expiry;
3. Worker path-containment is fixed and cross-platform tests pass;
4. Phase 5, the Phase 6 storage-provider scope and Phase 8 have explicit
   closure/defer decisions;
5. Auth/Users/IAM ownership is frozen or remediated enough not to force a
   Knowledge Forge rewrite;
6. the full baseline quality gate passes from a clean checkout;
7. roadmap and Project Context identify Phase 11 as next;
8. the Phase 11 brainstorm is reviewed;
9. a dedicated Phase 11 branch is created from the accepted baseline.

## Phase 11 brainstorm agenda

Before implementation, decide:

- Knowledge Forge aggregate and revision ownership;
- category/page identity and slug/language rules;
- draft, review, publish, reject and rollback state machine;
- Guardian permissions and protected-page policy;
- immutable revision and optimistic concurrency rules;
- Editor profile and safe delivery projections;
- Media references and attachment lifecycle;
- shared comments/bookmarks/reactions integration;
- Search, SEO, Activity and Gamification event contracts;
- deletion, tombstone, retention and moderation behavior;
- minimum verification frontend without new visual design;
- package sequence and Definition of Done.

## Audit completion blockers

- Node 24.18.0 is not active.
- Docker Engine and required services are not healthy.
- GitHub CLI is unavailable.
- Git remote write access and PR creation are unverified.
- External/local MinIO, ClamAV, SMTP and observability endpoints are not yet
  proven.

The static findings are actionable, but this audit cannot be marked complete
until the runtime and CI-facing checks are executed.
