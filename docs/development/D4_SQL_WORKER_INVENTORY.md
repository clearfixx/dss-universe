# D4 — SQL, relation and Worker ownership inventory

Date: 2026-10-16. Branch: `debt/d4-sql-worker-inventory`.
Starting source: `46b88ce` / draft PR #26 (unaccepted).
Status: **first-pass inventory, NOT exhaustive acceptance**. No runtime changes.

## Scope and proof standard

The frozen import inventory has 84 findings. That does not describe SQL ownership.
Review direct Prisma delegates, nested select/include/filter relations, raw SQL,
shared-row field ownership, owner fragments/root composition, Worker SQL and event
projections. IDs/FKs alone do not imply permission to read a foreign aggregate.
Conversely a worker persisting an explicitly owned projection is not automatically
a cross-owner violation. Runtime owner contracts and failure/transaction semantics
must be established, not inferred from file location.

Discovery on the starting source enumerates 17 API feature directories and 14
non-test Worker TypeScript files. A lexical direct delegate scan returns 352
matching lines; this is a candidate count, not 352 distinct operations or a
complete AST/ownership review. Dynamic accesses, nested relations, helper fragments
and raw SQL require separate inspection. Do not treat no search hit as proof.

Every reviewed operation needs: exact source path/method; tables/fields and logical
owner; read/write purpose; status/privacy predicates; order/pagination; transaction,
lock and failure stages; returned/event projections; characterization and required
transfer. A module is complete only when every applicable path has this evidence.

## Core Authorization — local transfer, acceptance open

Source: `apps/api/src/core/authorization/repositories/permissions.repository.ts`,
both methods; PermissionsService, AuthorizationModule, public exports and actual
call sites inspected. Core must be included: a feature-only scan would miss this.

- `findPermissionKeysByRoleNames`: empty names return immediately; otherwise
  rolePermission filtered by role.name with permission.key selection; deduplicate
  in first-seen order, not sorted order. IAM owns all queried facts.
- `findAccessProfileByUserId`: independent user anchor with nested roles and
  directPermissions. No ACTIVE filter or explicit ordering. Missing returns empty
  roles/permissions; role and direct permission keys deduplicate in current
  first-seen order. Auth owns opaque anchor; IAM owns assignments.
- Authorization owns decisions and the minimal access-profile consumer contract,
  not persistence authority over either producer. Current public repository/service
  exports are separately D4.4 surface debt. Do not remove legitimate consumers
  without characterizing and updating them.

Proposed separate prioritized package: IAM-owned narrow facts and root anchor
assembly, with Core Authorization consuming its own semantic inputs. Preserve
current nested-query schedule, short circuits, failure propagation and immediate
revocation evidence; no cache, ACTIVE policy or change to denial semantics.
The PR #26 IAM assignment reader is **not** an interchangeable implementation:
it explicitly orders assignments and selects IDs/names absent from this query.
Do not add extra reads or silently change order by reusing a superficially similar
capability. Real migrated characterization must cover both paths before transfer.
Owner approved this direction before Leaderboards on 2026-10-16. The subsequent
Authorization package implements the transfer; quality/acceptance evidence is
tracked separately. This does not close the remaining path-by-path inventory.

## Characterized composition: Leaderboards

Pre-transfer source at `17ad445`: `apps/api/src/modules/leaderboards/infrastructure/repositories/prisma-leaderboards.repository.ts`,
`page`; service UTC window calculation, module exports, domain projection and
`apps/api/test/leaderboards-foundation.e2e-spec.ts` also inspected.

| Data/fact                           | Owner                 | Existing use                                    |
| ----------------------------------- | --------------------- | ----------------------------------------------- |
| user ID and ACTIVE status           | Auth                  | eligible ranking population                     |
| username/displayName/avatarUrl      | Users                 | public cards                                    |
| account createdAt                   | Auth account evidence | deterministic tie breaker                       |
| community_point_entries             | Community Points      | signed period and all-time sums                 |
| reputation_entries                  | Reputation            | signed total through endsAt                     |
| level_definitions                   | Levels                | highest threshold not exceeding all-time points |
| title selections/grants/definitions | Custom Titles         | selected, unrevoked, active title               |

One parameterized SQL statement currently assembles every owner. Preserve its
statement-level view; replacing it with independent calls would weaken consistency.
It includes zero-point ACTIVE subjects, signed corrections, inclusive endsAt/start
boundaries, ROW_NUMBER ordered points DESC/createdAt ASC/id ASC, all-time levels,
viewer outside the requested page, nullable title and current number conversions.
Do not change formula, permissions, status semantics, selected-title predicates,
tie ordering or calendar rules during ownership transfer.

Owner-approved runtime design: Leaderboards-owned semantic page
input; named root infrastructure assembler; narrow guarded provider SQL fragments
owned by Auth, Users, Community Points, Reputation, Levels and Custom Titles.
Leaderboards owns rank/window/page semantics and its safe response mapping. Keep
one statement, not an extra existence read, new snapshot transaction, materialized
score, cache or generic SQL builder. No Prisma/SQL business contracts.

Before transfer add isolated migrated golden tests for ties/negative/zero scores,
all states, time boundaries, viewer off-page/missing, out-of-range pages, level and
selected-title state changes, projection allowlist and one-statement work. Existing
foundation HTTP E2E is one broad test on shared fixtures; it alone is insufficient
and has the separately recorded DEBT-045 global-fixture tie. Preserve actual edge
behavior in characterization; report unexpected defects separately, not fix silently.

Subsequent foundation: fourteen real migrated cases now characterize this path,
including both original SQL shapes and live state changes. See the
[operation plan](D4_LEADERBOARD_OWNERSHIP_PLAN.md). DEBT-060 records the confirmed
empty-page/missing-viewer total edge separately. This is progress in the inventory,
not exhaustive SQL/Worker acceptance. Runtime transfer now replaces the original
repository with RankingFactsLeaderboardsRepository and a root
PrismaLeaderboardRankingReader assembled from the seven guarded owner entries.
The ownership-only packet retained both original SQL fingerprints and bindings;
its verification is recorded separately in the ownership checkpoint. The subsequent
approved [DEBT-060 correction](../audits/DEBT_060_LEADERBOARD_TOTALS.md) changes
only final page assembly and separates population total from returned rows;
ranking-prefix hashes and binding order remain pinned to the original statement.

## Worker SQL inspected in this pass

Subsequent source-boundary review covers all fourteen Worker sources and records
each effect/owner, Auth producer allowlists, shared handler/marker semantics and
DEBT-061's confirmed identity mismatch: [Worker matrix](../audits/D4_WORKER_SOURCE_BOUNDARIES.md).
This does not certify live delivery, every producer/retraction or actual store
rollback/replay; those explicit acceptance gaps remain.

| File                               | Actual SQL/purpose                                                                                            | Initial boundary classification                                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| password-recovery.processor.ts     | Auth users ID/email/authVersion, ACTIVE row lock, password_resets monotonic upsert; commit before SMTP        | Auth-owned job persistence; document ownership/entry separately, no Users profile read       |
| email-verification.processor.ts    | Auth users ID/email/status/emailVerifiedAt row lock, email_verifications monotonic upsert; commit before SMTP | Auth-owned job persistence, same caution                                                     |
| postgres-activity.projector.ts     | activity_entries insert/retract from versioned events; no source-table query                                  | Activity-owned eventual projection; verify event producers/delivery authorization separately |
| postgres-media-processing.store.ts | media/variants status transition and atomic variants+original READY write                                     | Media-owned processing persistence; no unrelated feature SQL in inspected store              |
| processed-event.store.ts           | processed_events lookup/idempotent insert                                                                     | shared durable-consumer infrastructure; atomicity with handler needs separate review         |
| dead-letter.service.ts             | dead_letter_events insert then queue add                                                                      | shared recovery infrastructure; retention/redaction/retry needs separate review              |

Also inspected integration-event processor and `main.ts` wiring: Activity handler
uses the projector; Media processing uses its store; dedicated mail queues bind
the Auth processors. Security-email-alert processor reads no DB; its delivery job
contains an email address and fixed kind/time, not a credential. Do not declare
all job payloads safe without reviewing producers and logging/retention paths.

Preserve current request-age checks, per-subject lock, monotonic requestedAt,
token digest storage, post-commit SMTP, sanitized errors and raw-token confinement.
No move of tokens into Redis/audit/generic integration events is authorized.
No change to retry, consumer names, marker/handler atomicity or media state policy
belongs to a cosmetic ownership move. Existing abbreviated/missing Worker passports
are D5 input; do not rewrite those files solely while auditing SQL.

## Other inspected relation examples

- Community Points `entryInclude` selects its own reversal facts, not User profiles.
- Achievement award include reads owned definition/revocation; Custom Title grant
  include reads owned title/selection, not Users merely because selection has userId.
- Interactions comment reads include active mention recipient IDs; root comment
  write already composes Users/Auth matching separately.
- Content Access repository reads only owned gate/requirements. Notifications
  repository persists only owned preferences with atomic Core audit.
- Editor module wiring has no persistence delegate; source-wide review still
  required before claiming no hidden persistence anywhere in that module.

## Remaining review checklist — not completed by this first pass

Review every repository/reader/writer/helper and business ORM import across all
17 features: achievements, activity, ai-core, auth, community-points, content-access,
custom-titles, editor, iam, interactions, leaderboards, levels, media, news,
notifications, reputation, users. Cross-check schema relation targets and root
adapters; approved prior transfers are evidence, not a blanket exemption.

Complete all Worker sources and packages/jobs handler/marker/producer evidence,
Core Outbox dispatch/projection contracts, provider payload privacy, SQL transaction
semantics and rebuild/retraction policy. Mark reviewed owned operations distinctly
from open compositions, design questions and unauthorized behavioral defects.

Leaderboards characterization and owner-agreed runtime transfer are implemented
in separate draft packets; DEBT-060 is a separately approved count correction.
Next: complete the remaining path-by-path matrix. Authorization's local
transfer is recorded separately, not awaiting direction again. Continue
then D4.4 explicit surfaces/ORM isolation and D4.5 enforcement/acceptance. Full
D5–D7, stack audit, CI/review/owner acceptance and Phase 11 brainstorm remain.
Do not close D4 or start Phase 11 on the basis of this document.
