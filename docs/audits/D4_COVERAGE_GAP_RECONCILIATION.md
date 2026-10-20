# D4 remaining coverage: evidence, not a completion percentage

Date: 2026-10-20. Baseline: `1ba2c4849e927b424af5d5978d5986dccc363b6b`.

## Source inventory versus reviewed operations

The baseline inventory contains 832 tracked non-test TypeScript sources under
API and Worker (excluding `.d.ts` and spec/test/e2e-spec files).
Sorted path + newline + file bytes + newline SHA256:
`215011d57cf03c4bf95d61001853876088520ad79f09ab91d1c3c3e6bc2f52bc`.
New characterization tests do not change this runtime-source inventory.
Neither the file count nor a zero architecture inventory proves that all
operations have been reviewed. Historical inventories remain historical.

## Family-level evidence map

This table locates evidence; it does not certify current whole-family acceptance.
Older reports must be reconciled with subsequent fixes and current sources.

| Family           | Existing evidence / remaining reconciliation                                                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Achievements     | Persistence review and audit-evidence reconciliation; preserve imported DB regressions, not only branch-local history                                          |
| Activity         | Viewer-context ownership work and Worker source boundaries; Wall ordering DEBT-067 still needs explicit disposition                                            |
| AI Core          | Dedicated boundary review; limited implemented capabilities, not a claim of future Intelligence completion                                                     |
| Auth             | Lifecycle operation review and separate DEBT-068 destination fix; do not repeat the old bug as current                                                         |
| Community Points | Operation review and separate DEBT-062 cap serialization; live integration routing remains separately tracked                                                  |
| Content Access   | Dedicated operation review and root presentation composition; future counters are not implemented facts                                                        |
| Custom Titles    | Persistence review plus separate DEBT-064 serialization fix; old race evidence is historical                                                                   |
| Editor           | Operation review and presentation composition; DEBT-066 exact depth policy remains an owner decision                                                           |
| IAM              | Latest operation reconciliation PR60; removal of one unused export does not approve future owner policy                                                        |
| Interactions     | Owned reads/writers and mention composition; consolidate remaining method-level evidence before declaring full coverage                                        |
| Leaderboards     | Single-query runtime ownership and separate empty-page total fix; no formula changes authorized here                                                           |
| Levels           | Repository operation evidence; distinguish demonstrated behavior from untested event/concurrency schedules                                                     |
| Media            | Current profile predicates in browse/metrics/cleanup remain cross-owner; foundation packet is design/tests only                                                |
| News             | Owned snapshot, projection security fixes and reader transfers; reconcile current operation coverage, not only lexical imports                                 |
| Notifications    | Preferences persistence evidence; concrete Nest service export remains visible, no `index.ts` public barrel; later delivery scope is not pre-11 implementation |
| Reputation       | Owned read/write composition evidence; reconcile current methods with reports before acceptance                                                                |
| Users            | Owned profile composition and registration fragments; remaining social/Wall operation coverage must be explicit                                                |

Core Authorization, root infrastructure and Worker are cross-cutting evidence,
not additional feature modules. Worker source review does not prove exactly-once
delivery or the existence of every future integration consumer.

## Remaining sequence

1. Finish Media profile-asset foundation: actual PostgreSQL behavior, query
   shape, exact technical composition design. Obtain separate approval before
   production transfer; keep selection and guarded claim predicates together.
2. Implement and verify the approved transfer in its own logical package.
3. Reconcile Notifications consumers/export and remaining current method-level
   coverage for Interactions, News, Users and Reputation. Record exact gaps;
   do not start arbitrary new module audits because an earlier report is old.
4. Close D4 public-surface and integration acceptance with current evidence.
   Unproved optional concurrency schedules are not automatically new defects;
   reproduced correctness/security defects require separate debt disposition.
5. Execute D5 Passport/checker work, D6 inherited red-baseline corrections and
   D7 independent review/CI/accepted baseline. Current draft PRs are not merged
   acceptance, and local passing tests do not waive red CI.
6. Conduct the separate stack-boundary audit using the owner's existing
   `docs/audits/STACK_AUDIT_PLAN.md`; no stack replacement is intended.
7. Stop for the required Phase 11 brainstorm and approval before implementation.

Owner/Command Deck product changes stay in their appropriate phases. The
last-administrator security disposition (DEBT-047) must remain explicit rather
than silently equating the older role-holder guard with unique-owner policy.
S3/MinIO and shared Search Platform remain agreed deferred scope, not invented
Phase 11 blockers. No quantitative completion percentage is established here.
