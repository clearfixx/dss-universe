# D4 — Gamification transactional recipient ownership

Date: 2026-10-16. Status: bounded runtime transfer locally verified; inherited red
gates, CI/review/owner acceptance open. Branch `debt/d4-gamification-recipient-transactions`,
based on `090b3d4` / draft PR #23, not an accepted release baseline.

## Scope and ownership

Implements package 1 of the owner-approved
[subject-check plan](../development/D4_SUBJECT_CHECK_BOUNDARY_PLAN.md): manual
achievement awards and title grants. IAM transaction-local subject checks and
independent subject/assignment-anchor reads remain separate open packages.

Achievements and Custom Titles repositories no longer read the shared Users table.
Each delegates one operation-specific immutable command to its semantic port.
Root units of work bind the owner stateless writer and a Users-owned stateless
ID-only reader to the same default Prisma transaction. Root executes no owner SQL.
Only the infrastructure callback carries a Boolean existence result; no profile,
credential, status, ORM client or callback is a business integration contract.

The pair advisory lock, parallel recipient/active-definition/existing stage,
USER_NOT_FOUND → missing-definition → CONFLICT precedence, INSERT/include/mapping,
audit → outbox order and default transaction options are preserved. Every existing
recipient state remains accepted by persistence; this is not eligibility or
authentication. No new ACTIVE filter, retry, isolation, timeout or cache.

The original evidence algorithms move into owner-local stateless helpers reused
by both the new writers and existing definition/rule/consume/revoke/selection paths.
The original owned include shapes and title mapping are also reused. Root and
technical/public entries do not export these helpers or duplicate their algorithms.
Event producer/name/version/category, actor omission, aggregate and payload keys
remain unchanged. Existing Auth/IAM, scoring, DB schema/migrations, API schema and
frontend behavior are not changed. This is not full D4 closure.

## Verification

Initial pure adapter tests: **31 PASS**, normal exit (1.441 s). They pin parallel
read launch, lock key, result precedence, seven failure stages, evidence actor
shape, title mapping, root same-client/default lifetime and repository delegation.
Nine new coverage gates retain all 34 existing gates unchanged (43 total).

Focused migrated AppModule E2E: **25 PASS**, zero skipped, normal exit (12.039 s):
all 19 unchanged pre-transfer characterizations plus six new runtime tests. The
new cases prove the installed root-bound Users reader runs inside the transaction,
exact persisted audit/outbox payloads, actual post-read provider failure rollback,
and private-helper revocation reuse with retained history. Synthetic fixtures are
not login evidence; no successful authorization mock or disabled DB protection.
Expected pending-query rollback errors are logged in provider-failure scenarios;
the operation rejects with the original error and no INSERT/evidence survives.

Initial DB invocation omitted the explicit URL and hit the existing setup fallback
port 5433 with the test account; PostgreSQL rejected authentication before schema
creation. It was corrected to the disposable 5434 URL, not by changing credentials,
defaults or dev data. Initial adjacent filter-array invocation failed argument
parsing; affected commands were rerun with explicit arguments.

AST fixtures: **81 PASS**, including six new root/owner SQL and guarded-entry
checks. Frozen import inventory is not proof of table ownership; verify full
baseline and all remaining SQL/Worker paths separately. Full gates follow below.

Final full API opt-in unit/integration coverage: **1045 PASS / 144 suites**, zero
skipped, normal exit (74.674 s); Auth/recovery/IAM DB and Auth Redis opt-ins enabled.
All **43 thresholds PASS**, preserving the previous 34 unchanged. Nine new gates
have 100% statements/functions/lines; root units have 75% branches, writers 85.71%
(uncovered constructor dependency metadata), other five files 100% branches.
Initial coverage also passed 1045 tests/43 gates (101.888 s). Initial lint found
untyped test mock call tuples and one unnecessary cast; typed append signatures
fix them without lint disables, production changes or contract relaxation.

Final root lint/typecheck, Prisma validation, production build, architecture/license
and frozen baseline PASS. Build: six tasks successful, five unchanged cached
outputs, fresh API build (29.5 s). All 81 AST fixtures pass; frozen inventory
remains **84**, not a full architecture compliance certificate.

Fresh Editor 23 / Storage 43 / Worker 36 tests and all 14 dependency-patch tests
PASS. Initial Web coverage reports 58 PASS / 1 FAIL on the unchanged five-second
WIKI tool case; this is recorded as separate OPEN DEBT-058. A subsequent entire
Web coverage repeat with two workers and unchanged deadlines passes 59/59
(29.57 s). This does not close or determine the cause of that timeout. No authored
frontend code/test, assertion or timeout is changed.

Changed-file format/diff checks PASS. Global format remains red on 41 inherited
files; dependency audit remains 1 high / 10 moderate. GraphQL consistency is red
on known DEBT-044 barrel drift; its generated side effect is restored to exact
HEAD hash. Known DEBT-041 remains open even when it does not reproduce. No new
Web browser/dev-server smoke success is claimed.

Final full API E2E: **423 PASS / 1 FAIL**, 424 tests / 40 suites, zero skipped
(292.338 s). All 19 original subject-check characterizations, all six new runtime
cases, all 26 Auth cases, and existing Achievements/Custom Titles foundation
scenarios pass. Only known DEBT-045 fails: News viewCount null/zero expectation,
followed by its protected target cleanup rejection. DEBT-048 does not reproduce;
that separate debt remains open.

This run followed CPU-heavy gates on the independently revalidated disposable
tmpfs DB bound to loopback 5435, recreated from zero public tables with all 54
migrations and no seed. Dev 5433 and opt-in test base 5434 were not reset.
Complete JSON was emitted, but retained handles prevented normal exit. Only
verified completed own Jest PID 20224 was stopped after zero client connections
and zero owned test schemas; command exit was -1. This is not a successful process
exit or full green gate. No skip, timeout increase or disabled DB protection.

Ignored raw evidence: `node_modules/.cache/dss-d4-gamification-*` and current API
coverage files. Local evidence does not replace CI/review/owner acceptance.

## Remaining work

IAM transactional subject transfer and independent anchor reads, complete
delegate/relation/raw-SQL/Worker inventory, D4.4/D4.5, D5–D7, the requested stack
audit and owner acceptance remain required. DEBT-057 stays separate. The
owner-authored untracked stack audit plan is untouched/unstaged. Stop before Phase
11 for the mandatory brainstorm. No red/unaccepted parent is merged.
