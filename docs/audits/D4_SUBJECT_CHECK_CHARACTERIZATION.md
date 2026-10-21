# D4 — Subject-check characterization foundation

Date: 2026-10-15. Status: pre-transfer behavior verified; inherited red gates,
runtime transfer, CI and acceptance open. Branch `debt/d4-subject-check-characterization`,
based on `3493925` / draft PR #22. No red/unaccepted parent is merged.

The [complete plan](../development/D4_SUBJECT_CHECK_BOUNDARY_PLAN.md) inventories
four transaction-local checks and two independent IAM subject-anchor paths.
Production source is unchanged. The owner explicitly approved Users/profile versus
Auth/opaque-subject ownership on 2026-10-15, preserving all-state ID-only semantics,
transaction/lock/query stages and a separate IAM read package. No new ACTIVE policy
is inferred. Runtime transfer remains unimplemented.

## Focused result

**19 real migrated E2E PASS**, zero skipped, normal exit (6.385 s). All 54 real
migrations apply to an owned schema. Synthetic repository fixtures are not
authentication evidence. Real IAM safety policy and immutable DB protections
remain enabled. Tests prove current ID-only/all-state semantics, error/query
ordering, native transaction options, actual append rollback and two deterministic
award/title contention cases. Exact scenarios and limitations are in the plan.

The initial run's failures were fixture mistakes (group key format and existing
admin role), not production defects; fixtures were corrected without altering
constraints, services, budgets or authorization.

## Full quality evidence

Final opt-in API unit/integration coverage: **1014 PASS / 143 suites**, zero
skipped, normal exit (71.479 s), all four Auth/recovery/IAM DB and Auth Redis
opt-ins enabled. All **34 existing coverage thresholds PASS**, unchanged.
The initial run was 1013 PASS / 1 FAIL on the known DEBT-041 random TOTP
tamper assertion. The rerun is recorded separately; it does not close that debt
or prove a production encryption flaw. No Auth code/test is changed here.

Root lint/typecheck, Prisma validation, production build and architecture/license/
baseline PASS. Build: six tasks successful, five unchanged cached outputs,
fresh API build (27.111 s). Architecture: **75 tests PASS**, frozen inventory
**84 findings**, unchanged and not waived. Initial typecheck found six test-only
callbacks returning void instead of the contract's undefined; block-bodied
callbacks preserve the real IAM policy call, without changing that contract.

Fresh adjacent tests PASS: Editor 23 / Storage 43 / Worker 36 / Web 59, with
coverage gates where configured; all 14 dependency-patch regressions PASS.
Changed-file Prettier and diff whitespace checks PASS. Global format remains
red on 41 inherited files. Dependency audit remains 1 high / 10 moderate.
GraphQL consistency remains red on known DEBT-044 generated barrel drift;
its own generated side effect is restored to exact HEAD hash. No canonical
schema/frontend change or new browser/dev-server success is claimed.

Final full API E2E: **417 PASS / 1 FAIL**, 418 tests / 39 suites, zero skipped
(288.197 s). All 19 new subject-boundary cases, all 26 Auth cases, all 26 Users
boundary cases and 23 write/16 read Reputation cases pass. The only failure is
known DEBT-045: News viewCount null/zero expectation, followed by its protected
interaction-target cleanup rejection. DEBT-048 does not reproduce; it remains open.

The run followed CPU-heavy gates on the independently revalidated disposable
tmpfs DB on loopback 5435, recreated from zero public tables with all 54 migrations
and no seed. Dev 5433 and unit/integration base 5434 were not reset. Complete JSON
was emitted, but retained handles prevented normal exit. Only verified completed
own Jest PID 19244 was stopped after zero client DB connections and zero owned
test schemas; command exit was -1. This is not a successful process exit or full
green gate. No tests were skipped, timeouts raised or DB protections disabled.
Runtime ownership transfer and full D4 acceptance are not claimed.

Ignored raw evidence: `node_modules/.cache/dss-d4-subject-checks-*`. The owner-authored
untracked stack audit plan remains untouched/unstaged. Full transactional/anchor
transfer, SQL/Worker inventory, D4.4/D4.5, D5–D7, stack audit, owner acceptance and
Phase 11 brainstorm remain open; DEBT-057 stays separate.
