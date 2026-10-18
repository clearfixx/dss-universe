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
