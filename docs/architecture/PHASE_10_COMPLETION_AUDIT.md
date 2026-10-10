# Phase 10 — Implementation and Acceptance Audit

Date: 2026-10-10. Status: **packages 10.0–10.16 implemented; acceptance pending**.

The [News architecture](PHASE_10_NEWS_PLATFORM.md) records package delivery.
This audit separates code/test evidence from current runtime/release acceptance.

## Definition of Done evidence

| Requirement                            | Concrete evidence                                                                                                      | Remaining acceptance                                                  |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Author/review/publication              | `news.service`, `news-workflow.service`, immutable revisions and workflow repositories; matching unit specs            | Real DB/API lifecycle rerun                                           |
| Comments/votes/bookmarks/views         | Shared Interaction Target ownership; `news-delivery.service` and shared interaction repositories                       | Browser/API visibility and idempotency rerun                          |
| Editor/Media/gates                     | `@dss/editor` NEWS profile, Media references and gated attachment projection                                           | Full delivery redaction and binary lifecycle E2E                      |
| Pins/scheduling                        | `news-pins.service.spec.ts`, scheduler, pin/workflow repositories                                                      | Due-job retry and time-bound runtime checks                           |
| Pagination/navigation/SEO              | Settings/links/delivery service specs; published-only repository queries and Web metadata/sitemap                      | Generated-operation and browser checks                                |
| Feed/Search/Notifications/Gamification | Publication Outbox, Activity Worker projection, points author routing; News `searchText`; notifications routing events | Shared Search and inbox/email delivery are explicitly not implemented |

Service paths are under `apps/api/src/modules/news/application/services/` and
repositories under `apps/api/src/modules/news/infrastructure/repositories/`.
`apps/api/test/news-domain-foundation.e2e-spec.ts` exists but no passing fresh
full E2E run is inferred from its presence.

Committed migrations cover News domain, taxonomy/typed fields, templates/workflow,
scheduling, pagination/SEO links and pinning (`20260921*` / `20260922150000`);
the migration chain applied during D0.5 disposable DB verification. That proves
schema application, not all product acceptance paths.

## Corrected scope

Search is News-owned persisted projection/filtering, not shared Search Platform.
Publication metadata can support a future indexer. Notifications are durable
routing signals, not an inbox or email platform; delivery belongs to Phase 15.
Forum discussion links await canonical Forum Topic identity in Phase 13.
These boundaries are recorded in [D1 decisions](../development/D1_SCOPE_DECISIONS.md).

## Open exceptions

Known foreign-contract/Prisma leakage remains D2/D4 debt. Full baseline has format,
dependency-audit and browser/E2E gaps; unit tests and a build cannot waive them.
No historical completion exception is approved. D6 reruns acceptance; D7 and owner
review decide release readiness. Phase 11 remains unstarted.
