# D4 — Transactional subject checks and IAM anchor

Date: 2026-10-16. Status: pre-transfer characterization implemented; owner
semantics explicitly approved, gamification runtime follow-up linked below;
IAM runtime transfer open. Foundation branch
`debt/d4-subject-check-characterization`, based on `3493925` / draft PR #22.
The parent review stack is unaccepted, not a release baseline.

## Complete operation inventory

| Operation                | Existing check / schedule                                                                                     | Proposed owner and preserved boundary                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Achievements.manualAward | Advisory pair lock, then parallel ID-only recipient/definition/existing reads; recipient error has precedence | Users profile existence, inside the same transaction/parallel stage                                |
| CustomTitles.grant       | Advisory pair lock, then parallel ID-only recipient/title/existing reads; recipient error has precedence      | Users profile existence, inside the same transaction/parallel stage                                |
| IAM membership grant     | Group row lock → enabled group → ID-only subject → membership INSERT + audit                                  | Auth opaque subject existence, inside the current default transaction                              |
| IAM role revocation      | ID-only subject → role row lock → role → assignment → holder count → owned safety callback → DELETE           | Auth opaque subject existence, retaining explicit Read Committed                                   |
| IAM subjectExists        | Independent ID-only query, Boolean, every existing state                                                      | Narrow authoritative Auth existence contract, not ACTIVE eligibility                               |
| IAM findAssignments      | Independent subject-anchor query with nested IAM roles/permissions; null only if subject absent               | Root Auth-ID + IAM-owned assignment projection; preserve nested-query schedule, not a new snapshot |

Every current existence check accepts ACTIVE, DEACTIVATED, BANNED and soft-DELETED
rows. This is not authorization or account eligibility. Do not substitute the
existing Auth ACTIVE-ID selector, add a state filter, move the check before the
transaction, cache it or infer that repository acceptance authenticates a subject.
Application guards and policies remain authoritative at their existing points.

The physically shared row is transitional storage, not authority. For gamification,
recipient profile existence remains consistent with its already migrated Users
input port. IAM refers to an opaque authentication subject, not a public profile.
The owner explicitly approved this exact ownership distinction and all-state
ID-only semantics on 2026-10-15, including preserved transaction/lock/query stages
and a separate IAM independent-read package. Approval is not implementation or
release acceptance.

## Owner-approved runtime packages

1. **Gamification transactional recipient transfer:** semantic operation ports,
   scoped root units of work, Users-owned stateless ID reader, owned manual-award/
   title-grant writers. Preserve the existing parallel stage and result precedence.
   Runtime implementation/evidence: [gamification transfer](../audits/D4_GAMIFICATION_RECIPIENT_TRANSACTIONS.md).
   This bounded increment does not implement the remaining IAM packages below.
2. **IAM transactional subject transfer:** separate membership-grant and protected
   role-revocation semantics, Auth-owned stateless ID reader, scoped root transaction
   lifetime and owned IAM writers. Keep membership audit atomic, and retain role
   safety callback/row lock/count/delete and explicit Read Committed. Do not add
   an audit/outbox stage to role revocation that currently does not have one inside
   its persistence transaction.
   Local runtime transfer and fresh quality evidence:
   [IAM checkpoint](../audits/D4_IAM_SUBJECT_TRANSACTIONS.md).
   Bounded local verification is complete; inherited red gates/acceptance stay
   open, and independent reads remain below.
3. **IAM independent anchor/read transfer:** narrow subjectExists binding and
   owner-fragment assignment-anchor assembly. Preserve null versus empty assignment
   result, name/key ordering and current independent nested reads. A single Prisma
   operation is not necessarily one SQL statement or a snapshot transaction.

These are bounded execution packages, not permission to stop after the easiest
ID check. All six mapped paths remain part of full D4 acceptance. Before each
runtime transfer, finish its exact call/query/evidence characterization and
preserve the owned event payloads/selection/mappers. Shared audit/event algorithms
must remain owner-local and reused, not copied into root or duplicated between
old repository and new writer. No generic callback/ambient transaction framework.

Only root infrastructure/assembly and owner infrastructure can import guarded
stateless adapters. Business ports carry IDs/commands/results, never Prisma
clients, relation aggregates or SQL fragments. Any check callback is confined to
infrastructure; the existing role safety callback carries only IAM-owned policy
facts, no transaction object. No global isolation/timeout changes, owner features,
new tables, permissions, frontend, scoring or Phase 11 behavior.

## Pre-transfer evidence

`apps/api/test/transactional-subject-checks.e2e-spec.ts`: **19 migrated E2E PASS**,
zero skipped, normal exit (6.385 s), actual AppModule in an owned disposable schema.
No successful authorization mock. The role-policy test invokes the real existing
IamSafetyService against the admin role installed by migrations.

Tests cover all four states across the four writes, independent existence/empty
assignment anchors, missing-recipient precedence, disabled/missing groups before
subject lookup, inactive definitions, duplicate conflicts without new evidence,
five failures after genuine audit/outbox appends with unchanged persisted state,
protected last-admin rejection and role short-circuit order. Subject SQL selects
only ID, with no status/profile/credential fields.

Two real contenders for each award/title pair are observed waiting on an externally
held exact advisory key before release: one OK and one CONFLICT. Polling is
query-driven within the existing budget, with no sleeps or raised timeouts.
Test-only pinned-engine call-through records maxWait 2000 ms / timeout 5000 ms
for all four write paths; only role revocation specifies ReadCommitted.

Initial fixture errors used raw UUID group keys that may begin with digits and
attempted to recreate the migration-installed admin role. Fixtures were corrected
to a valid prefixed key and the existing role; no constraints or production code
were changed to make tests pass.

## Full gate and remaining scope

Run changed/global format, root lint/typecheck, Prisma validation, full opt-in API
coverage, full API E2E, adjacent workspace/patch tests, build, architecture/license/
baseline, generated consistency and dependency audit. Record complete JSON and
terminal status; inherited DEBT-045/open handles and other known red gates remain
unaccepted, not waived. Foundation results do not certify runtime ownership.

Evidence follows in [the foundation audit](../audits/D4_SUBJECT_CHECK_CHARACTERIZATION.md).
The characterization branch leaves production unchanged; its gamification runtime
follow-up is linked above. Remaining IAM transfer, full SQL/Worker review,
D4.4/D4.5, D5–D7, requested stack audit and owner acceptance remain required.
DEBT-057 stays separate. Stop before Phase 11 for its mandatory brainstorm.
The owner-authored untracked stack audit plan is not edited or staged.
