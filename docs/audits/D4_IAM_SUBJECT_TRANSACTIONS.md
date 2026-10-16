# D4 — IAM transactional subject ownership

Date: 2026-10-16. Status: bounded runtime transfer locally verified; inherited red
gates, CI/review and owner acceptance remain open. Branch
`debt/d4-iam-subject-transactions`, based on `73dc783` / draft PR #24, not an
accepted release baseline. No parent is merged.

## Approved scope

Implements package 2 of the owner-approved
[subject-check plan](../development/D4_SUBJECT_CHECK_BOUNDARY_PLAN.md).
Membership grants and role revocations no longer read the shared subject row
inside IAM repositories. Auth owns the stateless ID-only reader; IAM owns the
stateless writers, projections, results and existing safety check. Root units
bind one transaction client behind separate semantic ports. IAM and Auth do not
import each other's production implementation. Technical entries remain guarded;
normal roots publish only the explicit command contracts and safe value types.

Membership grant preserves group FOR UPDATE → enabled group → subject ID →
membership INSERT → attributable audit, with unchanged Prisma transaction
defaults. The original membership select is reused by grant/list/revoke. No
Outbox step is added. Role revocation preserves subject ID → role FOR UPDATE →
role → assignment → holder count → existing IAM safety callback → DELETE, with
explicit Read Committed. The callback receives only role name and holder count;
it is not a generic ORM/transaction callback. No audit/outbox stage is invented
inside this persistence transaction.

Existing ACTIVE/DEACTIVATED/BANNED/DELETED subjects still exist for these checks.
No eligibility filter, profile projection, cache, retry, timeout, new permission,
owner feature, schema/migration/API or authored frontend change. Standalone DB
fixtures now assemble the real root unit/Auth reader/IAM writer instead of
substituting a successful existence stub. Existing assertions, triggers and
concurrency budgets are retained.

## Verified local evidence

- Pre-transfer actual IAM DB suites: **22 PASS**, two suites, normal exit
  (3.596 s), RUN_IAM_DB_TESTS enabled against disposable loopback 5434.
- Post-transfer same DB assertions: **22 PASS**, normal exit (3.971 s), including
  both admin/super_admin lock contenders, last-holder policy denial, post-delete
  storage rollback, membership validity/history/Premium and audit rollback.
- New pure adapter suite: **25 PASS**, normal exit (1.173 s), including stage
  precedence/failures, exact audit, same-client root options, Auth ID-only reads
  and semantic repository delegation.
- Migrated AppModule/HTTP E2E: **29 PASS**, three suites, zero skipped, normal
  exit (18.126 s): all 19 unchanged pre-transfer characterizations, five existing
  access-group HTTP cases and five new IAM runtime regressions. New cases prove
  bound Auth reads, exact membership audit/no Outbox, role removal without new
  evidence, genuine post-read Auth failure rollback for both operations, and a
  real grant waiter observing group disable before any subject lookup.
- AST fixtures: **87 PASS**, including six new guarded-entry/owner SQL/lifetime
  checks. This is bounded evidence, not an exhaustive SQL inventory or baseline
  compliance certificate.
- The early typecheck (19.073 s) predates the final E2E addition and callback/
  barrier-cleanup refinement. Final full-tree typecheck and coverage now pass;
  final E2E evidence follows below, not inferred from that earlier run.

## Final quality gates

Full API opt-in unit/integration coverage: **1070 PASS / 145 suites**, zero skipped,
normal exit (66.39 s), with Auth/recovery/IAM DB and Auth Redis opt-ins enabled.
All **49 thresholds PASS**, retaining the previous 43 unchanged. Six new files
have 100% statements/functions/lines; root units have 75% branches and membership
writer 90% (uncovered dependency metadata), other three files 100% branches.
Initial full coverage also passed all 1070 tests/49 gates (52.965 s).

Final lint/typecheck/Prisma validation/build/architecture/license/baseline PASS.
All 87 AST fixtures pass; frozen inventory remains **84**, unchanged and not
waived. Build: six successful tasks, five unchanged cached outputs, fresh API
build (19.051 s). Initial lint found an unused mock argument, an unnecessary cast
and an unknown error rethrow; typed test mocks/Error wrapping fix them without
lint disables, weakened contracts or production behavior changes.

Fresh adjacent tests PASS: Editor 23 / Web 59 / Storage 43 / Worker 36, with
coverage gates where configured, plus all 14 dependency-patch regressions.
Web uses two workers and unchanged deadlines/assertions (26.97 s); this does not
close DEBT-050 or DEBT-058. Changed-file format/diff checks pass. Global format
remains red on 41 inherited files, dependency audit 1 high / 10 moderate, and
GraphQL consistency known DEBT-044 barrel drift. Own generator side effect is
restored exactly; no canonical schema or authored frontend change or new browser
smoke success is claimed.

Final full API E2E: **427 PASS / 2 FAIL**, 429 tests / 41 suites, zero skipped
(263.36 s). All 29 subject-characterization/IAM runtime/access-group HTTP cases
and all 26 Auth cases pass. Both failures are known DEBT-045: News viewCount
null/zero expectation with prohibited target cleanup, and the global leaderboard
10-point fixture tie. Read-only inspection of the two synthetic subject IDs in
the actual disposable DB confirms `points-user` was created at 02:39:17.273 UTC,
`leader-oldest` at 02:39:21.366 UTC (4.093 s later). Both have 10 month points;
all-time totals are 10 versus 60. Unchanged leaderboard SQL ranks points then
account creation time, so the earlier unrelated fixture wins. No scoring, sorting,
fixture or expectation is changed to hide this failure. DEBT-048 does not
reproduce; that separate debt remains open.

The full run followed CPU-heavy gates on the independently revalidated owned
disposable tmpfs DB bound to loopback 5435, recreated from zero public tables
with all 54 migrations and no seed. Dev 5433 and opt-in test base 5434 were not
reset. Complete JSON was emitted, but retained handles prevented normal exit.
Only verified completed own Jest PID 2188 was stopped after zero client DB
connections and zero owned test schemas; command exit was -1. This is not a
successful process exit or green full gate. No tests were skipped, budgets
raised or DB history protections disabled.

## Temporary verification interruption and recovery

An earlier adjacent quality invocation was rejected before process creation when
automatic approval review could not complete because of the usage limit. It was
not an unsafe-action ruling and did not start a process. The owner reported the
limit renewed and requested continuation; approval review then succeeded, and
Node 24.18.0/pnpm 11.9.0, working tree and services were revalidated on this branch.
No approval bypass or duplicate restart of a live command was used. The temporary
review failure is resolved, not a code defect or an outstanding blocker.
Known DEBT-041/044/045/048/050/058 and inherited format/audit/Web gates are not
waived. Do not weaken tests, raise budgets or disable DB history protections.

This increment is prepared as a separate draft review package based on
`debt/d4-gamification-recipient-transactions`. No merge or acceptance claim;
CI/review must be inspected separately.
Ignored local evidence: `node_modules/.cache/dss-d4-iam-transactions-*`.

## Remaining readiness

IAM independent subjectExists/findAssignments anchor transfer is still a separate
open package. Full delegate/relation/raw-SQL/Worker inventory, D4.4/D4.5, D5–D7,
the requested stack audit, CI/review/owner acceptance and mandatory Phase 11
brainstorm remain required. DEBT-057 remains separate. The owner-authored
untracked `docs/audits/STACK_AUDIT_PLAN.md` is untouched and must not be staged.
