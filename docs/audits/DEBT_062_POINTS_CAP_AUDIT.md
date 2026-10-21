# DEBT-062 — Distinct-event Community Points daily-cap race

Date: 2026-10-18. Source `0bbb407`; audit branch `debt/d4-persistence-matrix`.
Owner approved a separate atomic user/rule/UTC-day correction before Phase 11.
**This packet only characterizes/documents the defect; no runtime fix.**

## Confirmed cause and proof

PrismaCommunityPointsRepository.award serializes by eventId. The daily limit
applies to userId/ruleKey/UTC-day, so independent events hold different locks.
Both real COUNT reads can observe zero, then both append immutable entries and
processed/Audit/Outbox records. Atomic evidence per event does not serialize
the shared quota. The database has event/reversal uniqueness, not a quota row.

`apps/api/test/community-points-cap-audit.e2e-spec.ts` composes actual Points
service/repository, Users ID-only profile reader, Core Audit/Outbox writers and a
fresh fully migrated PostgreSQL schema per case. It does not mock a successful
count, ledger insert or provider. The concurrency schedule rendezvous is applied
only after each actual count result; a 1500ms observation deadline releases the
barrier on failure, without changing production transaction/Jest deadlines.
If both real reads cannot overlap, the `[0,0]` proof fails rather than faking it.

Two cases PASS, normal exit, 4.317s:

- sequential cap=1: AWARDED then CAPPED, balance 1, two processed markers,
  one matching award audit record and one Points-producer Outbox event;
- distinct concurrent events, same user/rule/day, cap=1: real counts `[0,0]`,
  AWARDED/AWARDED, balance 2, two ledger rows, two processed markers, two matching
  audit/outbox records; first-event retry DUPLICATE, later new event CAPPED.

These green diagnostic assertions pin the **undesired behavior**, not security
acceptance or successful remediation. Replace them with the desired invariant
regressions in the separately approved fix. No unauthenticated HTTP or live queue
reproduction is claimed; actual service/DB concurrency is established.
First two diagnostic attempts incorrectly counted all fixture audit rows;
assertions were scoped to `community-points.awarded` and the actual Points Outbox
producer, retaining exact ledger/marker/count proof. No fixture/history protection
was removed; initial failing evidence is retained, not represented as passing.

## Approved separate package

Add a shared per-user/rule/UTC-day serialization coordinate covering the actual
quota check and award commit. Preserve event idempotency, capped-event markers,
immutable rows, exact scoring/reversal semantics and transactional Audit/Outbox.
Verify distinct events at the last slot, duplicates, independent users/rules/days,
UTC boundaries, unlimited rules, rollback/failure and repeat delivery with
deterministic real DB interleavings. No API/schema/formula change or timeout
increase is approved by this audit. Source-reversal concurrency and runtime
consumer routing remain independently scoped questions.

Audit-packet full API E2E retains both diagnostic cases: 473 PASS / 1 known News
FAIL of 474 tests, 44 suites, zero skipped. This is not full green/security
acceptance. Detailed quality/retained-handle/GraphQL evidence is recorded in the
[operation matrix](D4_PERSISTENCE_REVIEW_MATRIX.md); new PR CI/review is required.
Neither DEBT-062 nor D4 is marked resolved by discovering and pinning this defect.

## Remediation work in progress

Branch `debt/d4-points-daily-cap-atomicity` adds a transaction-scoped advisory
lock before the quota COUNT for finite rules. Its JSON tuple contains the
namespace, user, rule and numeric UTC year/month/day, avoiding delimiter
ambiguity. Existing event lock remains first; both locks live through commit
or rollback. No schema, public API, scoring, isolation or transaction deadline
changes are made. Unlimited rules retain the event lock without quota locking.

The regression now holds the first actual COUNT result, observes a real
PostgreSQL advisory-lock waiter against that transaction's backend PID, then
releases it. Real counts must be `[0,1]`, outcomes AWARDED/CAPPED and committed
ledger/Audit/Outbox evidence exactly one award with two processed markers.
Additional migrated cases cover concurrent duplicate delivery, UTC offsets and
midnight, unlimited rules, independent user/rule quotas, and rollback of all
evidence on injected Outbox failure followed by successful retry.

Eight focused cases passed again on the final numeric UTC coordinate (14.047s).
Full API coverage with `RUN_AUTH_DB_TESTS`, `RUN_RECOVERY_DB_TESTS`,
`RUN_IAM_DB_TESTS` and `RUN_AUTH_REDIS_TESTS` enabled passed 1101 tests / 148 suites,
zero skipped, 59.403s, retaining all 68 coverage thresholds. An initial run used
incorrect opt-in variable names and skipped 92 tests; it is not the acceptance
run and its separate log remains available.

Repeated lint/typecheck and changed-file format passed. Prisma validation,
production build and architecture checks passed; baseline stays 84 findings,
not waived. Global format still reports 41 inherited files and dependency audit
still reports one high / ten moderate vulnerabilities.

Full E2E completed with 479 PASS / 1 FAIL of 480 tests, 44 suites, zero skipped,
382.508s. All eight cap regressions pass. Only inherited DEBT-045 News foundation
`viewCount` expected null / actual zero fails (line 478). The target was separately
verified disposable tmpfs PostgreSQL 5435 after fresh migrations, without seed.
Jest retained handles after complete JSON; exact owned PID 9860 was stopped only
after zero client connections and zero fixture schemas. Shell exit 1 is not a
normal green completion. GraphQL check remains red on DEBT-044 generated barrel
comment/newline drift; its own side effect was restored, schema and operations
unchanged. CI/review/owner acceptance remain pending; this evidence does not
close DEBT-062 or D4.

Adjacent package checks pass: Editor 23 tests, Storage 43 (coverage), Worker 36
(coverage), Web 59 (coverage, maxWorkers=2), dependency patches 14. PostgreSQL
`SHOW default_transaction_isolation` on the E2E target reports `read committed`;
reviewed Prisma provider/transaction helper does not override isolation. The
quota COUNT executes after acquiring the quota lock, not before it. This is a
deliberate dependency on existing statement snapshots, not a new global setting.
