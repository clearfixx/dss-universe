# D4 — Authorization assignment read ownership

Date: 2026-10-16. Branch: `debt/d4-authorization-reads`.
Parent: `46b88ce` / draft PR #26, unaccepted review stack.
Owner explicitly approved Authorization before Leaderboards on 2026-10-16.

## Transfer

Core Authorization's compatibility repository now delegates two independent fact
operations through consumer-owned input ports. IAM owns named-role key queries,
the original unsorted nested assignment select and first-seen mapping. Root binds
the role provider and composes Auth's ID predicate with IAM relations. No feature
imports another feature. Technical fragments remain guarded infrastructure entries;
business inputs carry only names/IDs and minimal string-array facts.

Missing subject remains empty roles/permissions, not an eligibility error. Existing
ACTIVE/DEACTIVATED/BANNED/DELETED subjects keep their current assignment facts.
No ACTIVE filter, positive cache, pre-read, snapshot/transaction, timeout, permission,
scoring, API/schema/migration or frontend change. Role/direct ordering stays
unspecified; dedup preserves first occurrence, with role keys before direct keys.
Provider failures propagate. Guard/session/capability decisions remain unchanged.
Current broad Core service/repository exports are retained for D4.4, not claimed
as resolved by this package. Ordered IAM assignment reader is intentionally not
reused because its select/order differs.

## Characterization and regressions

Before transfer: **9/9 migrated AppModule E2E PASS**, zero skips, normal exit
(5.764 s). Populated subject reads use seven SELECTs; role-name reads use two;
empty names do no SQL. Query completion order varies across parallel branches.
After transfer: the same **9/9 PASS**, normal exit (5.958 s). Subsequent golden
assertions pin table counts/dependencies, no ORDER BY or non-SELECT work, no
status/profile/credential fields, missing and existing-empty anchors and fresh
revocation reads. Pure tests pin exact original Prisma operations, first-seen
deduplication, duplicate roles, empty roles, no extra transaction and provider errors.

Content Gate audience integration moved to root composition because it now composes
the real new Authorization/IAM adapters. All existing Premium/staff redaction,
ALL/ANY threshold and immediate audience/Premium revocation assertions remain;
no successful authorization stub or history constraint suppression.

Initial full coverage: 1080 PASS / 4 FAIL. Three Content Gate tests still manually
constructed the old one-argument repository; the IAM metadata test expected the old
exports. Updated actual wiring and the explicit narrow-token expectation, retaining
all assertions. Initial typecheck detected the same old constructor. Full coverage
then passed 1084/147 suites with all 59 thresholds. Final published contract imports
were followed by fresh full gates; final results recorded below after completion.

## Quality and remaining readiness

- Final full opt-in API coverage **1084/1084 PASS**, 147 suites, zero skipped,
  normal exit (51.504 s); **59 thresholds PASS**, five new 100% targets.
- Final root lint, typecheck, Prisma validation, build PASS. Six build tasks,
  five cached, fresh API (19.186 s). An intermediate build during contract-export
  publication failed on a missing type export; final imports/exports were followed
  by fresh lint/types/build and full coverage, not a waiver of that failure.
- Architecture/license PASS: **89/89 AST tests**. Frozen feature import inventory
  remains **84**; it does not count the now-removed Core persistence dependency.
  New targeted regression pins Core's no-Prisma fact delegation.
- Adjacent Editor 23, Web 59 (two workers, unchanged deadlines), Storage 43,
  Worker 36 and dependency patches 14 PASS.
- Changed formatting PASS; global format RED (41 inherited files), audit RED
  (one high/ten moderate), generated consistency RED (DEBT-044 barrel drift).
  Only the generator's own local barrel change restored exactly; no authored UI.

Full API E2E: **436 PASS / 6 FAIL**, 442 tests, 42 suites, zero skipped,
265.852 s to completed JSON. News DEBT-045 is one failure. Five cases in Community
Points/Outbox/Audit fail before assertions during AppModule initialization on
`UNKNOWN ... open schema.gql`; recorded separately as new **DEBT-059**, cause
unproven. All nine new read-boundary and nine existing Authorization E2E pass;
all 23 subject-boundary and five IAM transaction tests pass. No full-green claim.

Jest retained handles after the complete report. Zero client connections and zero
owned schemas verified, then only own verified PID 9280 stopped. Terminal exit 1,
not successful normal completion. Separate bounded repeat of all three affected
suites plus the new ownership suite: **14/14 PASS**, normal exit (12.624 s), no
deadline/assertion/protection changes. This neither replaces the full result nor
closes DEBT-059. Schema exists and has no Git diff after the run.

The full run used the verified recreated disposable DB 5435: exact project,
service/loopback binding/tmpfs and zero clients checked before recreation, empty
public schema then 54 migrations verified. No seed; dev 5433 untouched. Its full
results and process status are retained separately from the bounded repeat.
Known global format/audit/generated/Web smoke and DEBT-045 remain unwaived.
Parent PR #26 CI containment Windows/Linux PASS; Web smoke 10 PASS/3 FAIL on
DEBT-034 `Enter Station`, confirmed from job `116790737919` logs. Audit RED;
main job still running at inspection. No CI completion or review acceptance claim.
The working SQL/Worker inventory is included as a first-pass artifact, not exhaustive
D4 acceptance. Full inventory, Leaderboards ownership, D4.4/D4.5, D5–D7, stack audit,
CI/review/owner acceptance and mandatory Phase 11 brainstorm remain. No Phase 11.
Owner-authored untracked stack audit plan remains untouched and unstaged.

Ignored evidence: `node_modules/.cache/d4-authz-*`.
