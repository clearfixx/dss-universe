# D4 remaining coverage: evidence, not a completion percentage

Date: 2026-10-20. Baseline: `1ba2c4849e927b424af5d5978d5986dccc363b6b`.

## Source inventory versus reviewed operations

The baseline inventory contains 832 tracked non-test TypeScript sources under
API and Worker (excluding `.d.ts` and spec/test/e2e-spec files).
Sorted path + newline + file bytes + newline SHA256:
`215011d57cf03c4bf95d61001853876088520ad79f09ab91d1c3c3e6bc2f52bc`.
This is a frozen pre-transfer inventory, not the current source count after
Media runtime composition. Tests alone did not change it; later production
adapters did. Retain the baseline hash as historical evidence.
Neither the file count nor a zero architecture inventory proves that all
operations have been reviewed. Historical inventories remain historical.

## Family-level evidence map

This table locates evidence; it does not certify current whole-family acceptance.
Older reports must be reconciled with subsequent fixes and current sources.

| Family           | Existing evidence / remaining reconciliation                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Achievements     | Persistence review and audit-evidence reconciliation; preserve imported DB regressions, not only branch-local history                            |
| Activity         | Viewer-context ownership work and Worker source boundaries; Wall ordering DEBT-067 still needs explicit disposition                              |
| AI Core          | Dedicated boundary review; limited implemented capabilities, not a claim of future Intelligence completion                                       |
| Auth             | Lifecycle operation review and separate DEBT-068 destination fix; do not repeat the old bug as current                                           |
| Community Points | Operation review and separate DEBT-062 cap serialization; live integration routing remains separately tracked                                    |
| Content Access   | Dedicated operation review and root presentation composition; future counters are not implemented facts                                          |
| Custom Titles    | Persistence review plus separate DEBT-064 serialization fix; old race evidence is historical                                                     |
| Editor           | Operation review and presentation composition; DEBT-066 exact depth policy remains an owner decision                                             |
| IAM              | Latest operation reconciliation PR60; removal of one unused export does not approve future owner policy                                          |
| Interactions     | Owned reads/writers and mention composition; consolidate remaining method-level evidence before declaring full coverage                          |
| Leaderboards     | Single-query runtime ownership and separate empty-page total fix; no formula changes authorized here                                             |
| Levels           | Repository operation evidence; distinguish demonstrated behavior from untested event/concurrency schedules                                       |
| Media            | Profile-aware library ownership locally transferred in draft PR62; foundation and runtime evidence remain separate, CI/review acceptance open    |
| News             | Owned snapshot, projection security fixes and reader transfers; reconcile current operation coverage, not only lexical imports                   |
| Notifications    | Unused concrete Nest service export removed in the current bounded packet; metadata regression red-before/green-after, full verification pending |
| Reputation       | Owned read/write composition evidence; reconcile current methods with reports before acceptance                                                  |
| Users            | Owned profile composition and registration fragments; remaining social/Wall operation coverage must be explicit                                  |

Core Authorization, root infrastructure and Worker are cross-cutting evidence,
not additional feature modules. Worker source review does not prove exactly-once
delivery or the existence of every future integration consumer.

Current follow-up: [operation reconciliation](D4_EXIT_OPERATION_RECONCILIATION.md)
records source-level review of the remaining47 infrastructure files across
Users, Reputation, Interactions and News, with explicitly bounded context review.
It also records confirmed DEBT-070 and the owner's approval of a separate
pre-11 security correction. That characterization is not a safe privacy test.
The current scoped runtime fingerprint has838 sources; the832 count above
remains historical. Full E2E508/510 (known News and App failures), format/audit
and GraphQL consistency remain red. Further context/CI/acceptance reconciliation
is pending; this update does not declare D4 complete.

News interaction follow-up at6eaf383: [current HTTP/source evidence](D4_NEWS_INTERACTION_AUDIENCE.md)
confirms DEBT-071 guest engagement eligibility divergence, including inherited
comment READ. Normal editorial publication and actual session states are used;
no authored text leak is claimed. The owner approved a separate correction with
viewer-context design first; no runtime fix is included in this audit.
This closes the previously uncharacterized route question, not the defect or
full D4 acceptance. Adjacent Wall guest behavior remains explicitly unproved.

## Remaining sequence

1. Media foundation and separately approved runtime transfer are locally
   implemented and published as draft PR61/62, with inherited red gates explicit.
   See [runtime evidence](D4_MEDIA_PROFILE_ASSET_RUNTIME.md); CI/review acceptance
   is not implied by publication.
2. Complete current Notifications provider-surface verification and publication;
   see [packet evidence](D4_NOTIFICATIONS_PRIVATE_SURFACE.md): API1169/1169,
   migrated E2E508/509 (only inherited News viewCount), App27/27 and two
   preferences atomicity cases pass. CI/review acceptance remains open. Delivery features
   and representation cleanup are not smuggled into this export change.
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
