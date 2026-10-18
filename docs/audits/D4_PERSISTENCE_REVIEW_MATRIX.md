# D4 — Persistence operation matrix, first reviewed tranche

Date: 2026-10-18. Branch `debt/d4-persistence-matrix`, based on `0bbb407` /
draft PR #31 (unaccepted). **Partial source review, not exhaustive D4 acceptance.**
No production source, schema, migration, provider, timeout or policy changes.

## Discovery boundary

Git-tracked non-test TypeScript under API modules/Core/composition and Worker:
801 files. Lexical candidates containing PrismaService, `$queryRaw`, `$executeRaw`
or `.query(`: 90 files, not 90 operations or complete persistence coverage.
Stateless owner shapes/SQL fragments, aliases, nested relations and ORM-only type
imports require explicit follow-up; zero matches cannot certify a module.
Sorted project-relative path + newline + file bytes + newline SHA-256:
`7baba3b9c70a5933142a23340034fae653073df5becff4eeaa4ed9b718b52211`.

| Candidate group  | Files | Current review status                                                                        |
| ---------------- | ----: | -------------------------------------------------------------------------------------------- |
| Root composition |    17 | prior packet evidence plus selected contextual reads; full operation reconciliation pending  |
| Core             |     4 | Audit/Outbox/dispatcher/runner reviewed below; remaining coordination/privacy checks pending |
| Achievements     |     2 | consume service/wiring inspected; repository review incomplete                               |
| Activity         |     1 | repository and application/transport ownership traced below                                  |
| Auth             |    10 | prior D3/D4 evidence; full current reconciliation pending                                    |
| Community Points |     1 | all repository methods traced below; DEBT-062 confirmed                                      |
| Content Access   |     1 | prior packet evidence; full current reconciliation pending                                   |
| Custom Titles    |     2 | prior packet evidence; full current reconciliation pending                                   |
| IAM              |     8 | prior packet evidence; full current reconciliation pending                                   |
| Interactions     |     9 | prior packet evidence; full current reconciliation pending                                   |
| Levels           |     1 | repository and consume/progress context traced below; live delivery incomplete               |
| Media            |     7 | only avatar/cover candidate/delegation paths reviewed in this tranche                        |
| News             |     8 | workflow event production and settings context inspected, not whole module accepted          |
| Notifications    |     1 | prior first-pass source evidence; not completed in this tranche                              |
| Reputation       |     3 | prior packet evidence; full current reconciliation pending                                   |
| Users            |     9 | candidate repositories/readers reviewed below; owner helpers/business paths still pending    |
| Worker           |     6 | SQL candidates only; fourteen-source review remains separately recorded                      |

AI Core, Editor and Leaderboards have no match in this limited candidate search;
that is not a negative ownership proof. Leaderboards explicitly contributes SQL
fragments and consumes a root reader. All seventeen features remain in full scope.

## Community Points — all methods of the owned repository

Source: `apps/api/src/modules/community-points/infrastructure/repositories/prisma-community-points.repository.ts`.
Context: its service, public module/balance port, profile-existence reader,
GraphQL resolver, schema and migration constraints. `User` is accessed only
through the composed ID-only profile existence input, not inside this repository.
Audit, Outbox and per-consumer processed markers are explicit coordination data,
not authority to read Auth/Users aggregates.

| Operation                  | Tables/facts and ownership                                      | Schedule, policy and evidence boundary                                                                                                                                          |
| -------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| balance                    | owned community_point_entries                                   | signed sum for user; null sum becomes zero; no materialized user score                                                                                                          |
| rules                      | owned community_point_rules                                     | key ascending, no implicit enabled filter                                                                                                                                       |
| matchingRules              | owned rules                                                     | matching event/enabled; null or matching payloadValue; payloadValue DESC then key ASC                                                                                           |
| updateRule                 | owned rules + Core Audit                                        | transaction existence check/update/audit; missing returns null; no event rewrite                                                                                                |
| award                      | owned ledger/source tombstone + processed marker + Audit/Outbox | event-ID advisory lock; duplicate check; revoked-source read; optional UTC-day count; append entry/marker/evidence atomically; **DEBT-062** distinct-event cap race             |
| findOriginalById           | owned ledger + own reversal relation                            | originals only, nullable result; no profile join                                                                                                                                |
| reverse                    | owned ledger/reversal + evidence                                | original-entry advisory lock; reject missing/already reversed; append exact negative, no history rewrite                                                                        |
| reverseSource              | owned revoked-source and ledger/reversal + evidence             | source-coordinate lock; insert tombstone before reading unmatched originals; duplicate returns empty; concurrent award/retraction ordering still needs independent verification |
| history                    | owned ledger/reversal                                           | batch transaction list/count/signed balance; originals list only; occurredAt DESC/id DESC; skip/take after user input validation                                                |
| appendReversal             | owned ledger + Audit/Outbox                                     | caller transaction; copies original user/rule and negates original points; unique reversal reference                                                                            |
| dailyAwardCount            | owned original ledger rows                                      | user/rule/UTC-day `[start,end)`; not a row lock or quota reservation                                                                                                            |
| markProcessed              | processed_events coordination                                   | stable event/consumer tuple; same transaction as award/cap/source-ignore                                                                                                        |
| appendEvidence             | Core Audit/Outbox                                               | user/rule/points/source IDs only; reason/occurrence audited; versioned award/reversal event                                                                                     |
| lock / toDomain / reversal | technical advisory lock and safe owned value mapping            | no additional owner read or exception suppression                                                                                                                               |

Distinct-event cap proof uses actual service, repository, ID-only Users reader,
Audit/Outbox writers and fully migrated PostgreSQL. It pauses only after two real
COUNT results; values are not mocked. See [DEBT-062 proof](DEBT_062_POINTS_CAP_AUDIT.md).
Reversal races, mutable-rule freshness and complete delivery remain **unproved**;
do not infer them from this focused diagnostic.

## Levels — owned persistence versus external balance facts

Source: `apps/api/src/modules/levels/infrastructure/repositories/prisma-levels.repository.ts`;
context: LevelsService, resolver and root scalar Points/recipient adapters.

| Operation        | Owner facts                                         | Schedule and retained limits                                                                                                       |
| ---------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| definitions      | level_definitions                                   | level ASC                                                                                                                          |
| updateDefinition | owned definitions + Audit                           | definitions advisory lock; previous/next/duplicate reads; contiguous/strict threshold checks; upsert/audit atomically              |
| sync             | level_transitions + processed marker + Audit/Outbox | per-user lock; duplicate short circuit; latest createdAt DESC/id DESC; append every UP/DOWN crossing and marker in one transaction |
| history          | owned transitions                                   | batch list/count, occurredAt DESC/id DESC, page/limit                                                                              |
| appendTransition | owned transition + Audit/Outbox                     | caller transaction, exact source ID/direction/balance; no mutable User level                                                       |
| lock / toDomain  | coordination and value mapping                      | no foreign persistence                                                                                                             |

Service progress/consume obtains profile existence, scalar Points balance and
definitions through owned ports before sync. No Prisma object crosses those ports.
Source-event ordering and balance changing between calculation and the per-user
sync lock need separate concurrency evidence; this review does not certify them.
Read-derived progress is distinct from persisted transition-history delivery.

## Activity — projection, context and transport are different boundaries

Sources: Activity `prisma-activity.repository.ts`, ActivityFeedService,
ActivityFeedRankerService, ActorActivityReaderService, GraphQL feed resolver/model;
Users `prisma-user-activity-context.reader.ts`; root ActivityViewerContextAdapter.

| Operation                     | Owner facts                      | Schedule and retained limits                                                                                                      |
| ----------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| findByActor                   | activity_entries                 | non-retracted PUBLIC/MEMBERS; batch list/count; occurredAt DESC/id DESC; no viewer/source policy added                            |
| lastVisitedAt                 | activity_feed_states             | user ID lookup; missing null                                                                                                      |
| findFeedCandidates            | activity_entries                 | PUBLIC guest, PUBLIC/MEMBERS member; module/block inputs; retractedAt null; deterministic order; existing 500-candidate bound     |
| markVisited                   | activity_feed_states             | owned upsert, no foreign profile update                                                                                           |
| metadata                      | owned JSON projection            | scalar/null entries only; not a per-key secrecy allowlist                                                                         |
| viewer context                | Users interests/follow/block IDs | interests first, then parallel edges; active edges/bidirectional blocks; no invented Auth ACTIVE filter; root copies three arrays |
| findFeed/rank                 | owned use case/policy            | guest skips context; member visit then context then candidates; ranking/unread before pagination; errors propagate                |
| public/viewer GraphQL mapping | explicit transport fields        | no metadata/title/body in schema or mapper; public feed unguarded, viewer feed/visit JWT guarded                                  |
| actor summary adapter         | explicit actor/subject summary   | drops metadata/body before Users contract; Users retains profile/privacy decisions                                                |

News Worker stores title/slug/tags internally for personalization, but neither
reviewed public transport exposes those metadata fields. **No title/body HTTP leak
is established by seeing metadata in the projection table.** Source availability,
future visibility changes and News retraction/refresh are still separate lifecycle
questions, not answered by an import graph or direct repository read.

## Selected Users and Media paths

| Exact source under `apps/api/src/modules/`                               | Operations                                                     | Ownership/schedule                                                                                                                                                           |
| ------------------------------------------------------------------------ | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| users/infrastructure/repositories/prisma-user-social-graph.repository.ts | follow/unfollow/isFollowing/summaries/followers/following/page | only Users follow edges; transactional reversible mutation + Audit; grouped counts run in parallel; page list/count in batch transaction; IDs only, no profile/Auth relation |
| users/infrastructure/repositories/prisma-user-wall.repository.ts         | create/findById/list/tombstone/toDomain                        | read own wall rows; composed transaction port for writes; list/count batch; tombstones strip body/image in projection; no Media/Interaction SQL here                         |
| media/infrastructure/repositories/prisma-avatar.repository.ts            | findCandidate/assign/remove                                    | Media-owned ID/owner/kind/status/visibility/variant selection; writes delegate to profile-asset transaction input                                                            |
| media/infrastructure/repositories/prisma-cover.repository.ts             | findCandidate/assign/remove                                    | same owned candidate boundary for cover; no Users update inside adapter                                                                                                      |

A foreign ID/FK is not automatically a foreign aggregate read. These reviewed
paths are not an acceptance certificate for other methods/files of their modules.

Additional reviewed sources under `users/infrastructure/repositories/`:

| Source                                           | Operations                                       | Owned facts and retained semantics                                                                                                                                                  |
| ------------------------------------------------ | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| prisma-user-block.repository.ts                  | block/unblock/existsEitherDirection/blockedUsers | user_blocks and user_follows only; block upsert plus both-direction follow removal and Audit in one transaction; idempotent no-op paths; list/count batch, createdAt DESC, IDs only |
| prisma-user-privacy.repository.ts                | findByUserId/findManyByUserIds/upsert            | own privacy settings; optional find result; batch IDs; upsert/Audit together; no credentials or role read                                                                           |
| prisma-user-social-links.repository.ts           | findByUserIds/replaceForUser/toDomain            | own active links; user/position/platform ordering; soft-disable then platform upserts/Audit/final read in one transaction; returned link field allowlist                            |
| prisma-profile-display.reader.ts                 | findUsername                                     | username only by opaque ID; missing null; failures propagate                                                                                                                        |
| prisma-profile-existence.reader.ts               | exists                                           | ID-only lookup; every existing account state; not Auth eligibility                                                                                                                  |
| prisma-transactional-profile-existence.reader.ts | exists                                           | same ID-only evidence using caller root transaction; no new transaction lifetime/cache                                                                                              |

Per-operation transactions do not certify a concurrent follow/block invariant.
Business check-versus-write ordering, source availability, remaining stateless
profile/role/asset helpers and application/transport privacy paths still require
their own evidence; no unproved behavioral fix is introduced by this matrix.

## Core Outbox / Worker trace and Phase 8 acceptance

Core OutboxWriter persists caller event data in the caller transaction; AuditWriter
redacts sensitive metadata keys and appends in that same transaction. Dispatcher
finds due PENDING rows, CAS-claims PROCESSING, enqueues one integration job with
stable event ID/retries, then marks PUBLISHED. On enqueue/update failure it returns
the record to PENDING; stale PROCESSING claims recover by age. PUBLISHED means
queued, **not** that every downstream domain effect completed. Full payload/metadata
and raw dispatcher error retention require producer/operator privacy review.

OutboxDispatcherRunner periodically recovers then dispatches; timer unrefs and
clears on shutdown. Worker `main.ts` routes the integration queue to only
PostgresActivityProjector through createIntegrationEventProcessor. That projector
handles wall create/retract and News publish, then returns for other events.
The generic processor marks an accepted no-op handler event processed; the handler
and generic marker are not one transaction. Consumer v1/v2 mismatch remains DEBT-061.

CommunityPointsService/LevelsService/AchievementsService each expose `consume`,
but reviewed module wiring, root gamification composition, resolvers and Worker
contain no production route invoking those service consumers. Existing foundation
E2E invokes them directly. The old pre-D4 baseline `173358d` also routes only
Activity: this is not introduced by removing broad service exports in D4.
This strengthens existing **DEBT-007 Phase 8 runtime acceptance**, not a newly
implemented consumer package. No live queue delivery certification is claimed.
Before accepting automatic gamification, design explicit owner-safe durable
consumer routing, identities/idempotency, retry/replay/backfill and actual
producer→queue→ledger→level/achievement regression. Do not simply reuse markers
from an Activity-only consumer as proof that points were awarded.

## Audit packet verification checkpoint

Targeted cap characterization: 2/2 PASS, normal exit, 4.317s; it demonstrates
undesired concurrent overshoot, not successful anti-abuse remediation.
Full opt-in API coverage: 1101/1101 tests, 148 suites, 67.478s, normal exit;
all 68 existing thresholds retained. Root lint PASS after exact typing of the
test observer bind (no rule suppression); typecheck/Prisma PASS; production build
PASS (6 tasks, 5 cached, fresh API, 23.328s). Architecture PASS (91 AST cases),
frozen inventory unchanged at 84 open findings. Editor 23, Storage 43, Worker 36,
Web 59 and dependency-patch 14 tests PASS. Changed-file format/diff checks PASS.

Global format remains red on 41 inherited files; audit remains red on 1 high/
10 moderate findings. Parent PR #31 remains draft/unaccepted: both containment
jobs PASS, Web smoke/audit FAIL, main quality still live at the inspected revision.
Full API E2E: 473 PASS / 1 FAIL of 474 tests, 44 suites, zero skipped, 357.86s.
Both new diagnostic cases PASS in that full run; they still pin the defect, not
its correction. Only known DEBT-045 News viewCount null-versus-zero fails.
After complete JSON, Jest retains handles; only verified owned PID 9148 was
stopped after zero DB clients and zero fixture schemas. Shell exit -1
(4294967295), not a normal green completion. Initial full report is retained.
No deadline, fixture isolation or history protection was weakened.
GraphQL check reproduces only DEBT-044 generated-barrel drift; that command's
own comment/newline change is restored. schema.gql/operation outputs unchanged;
this does not make GraphQL check green. New PR CI/review remains required.
The full E2E target is a verified tmpfs loopback 5435 container with zero clients
before recreation and 54 migrations applied, no seed; dev DB 5433 is untouched.
User-owned STACK_AUDIT_PLAN.md is unchanged. No runtime source/package changes.

## Still required

The [Core Events/Audit follow-up](D4_CORE_EVENTS_PERSISTENCE_REVIEW.md) traces
dispatcher/runner/queue operations, transactional writers, schema and migrations.
Four migrated cases verify CAS, commit/redaction, real uniqueness rollback and
confirm DEBT-065 stale-attempt publication regression. Queue boundary is doubled;
no live delivery-loss or duplicate domain-effect claim. Separate correction
approved by owner on 2026-10-19; current audit gates/publication remain pending. Producer retention,
operator privacy and complete transport/Worker reconciliation are still open.

The [Custom Titles follow-up](D4_CUSTOM_TITLES_PERSISTENCE_REVIEW.md) traces owned
persistence, root grant transaction, service/transport/schema and actual migration
checks (including partial active-pair unique index absent from Prisma schema).
Two deterministic migrated diagnostics confirm DEBT-064 selection versus revoke/
deactivate; they pin undesired behavior, not a fix. Separate correction approved
by the owner on 2026-10-18;
current audit published as draft PR #38. Full E2E is 483 PASS / 1 inherited
DEBT-045 FAIL / 0 skipped of 484; both diagnostics pass. Unit coverage is
1101/1101; lint/types/build/Prisma and adjacent tests pass. Known global format,
dependency audit and GraphQL drift remain red. Full D4 acceptance remains open.
Separate correction PR #39 subsequently implements the approved per-user and
shared/exclusive title-lock design. Seven migrated regressions pass; full E2E
488 PASS / 1 inherited DEBT-045 FAIL / 0 skipped of 489. CI/review/owner
acceptance remain open. See [DEBT-064 design](../development/DEBT_064_SELECTION_DESIGN.md).

The [Achievements follow-up](D4_ACHIEVEMENTS_PERSISTENCE_REVIEW.md) traces all
owned repository methods, manual root transaction, semantic evidence, service,
transport and schema constraints. Three migrated cases cover exact cap/evidence,
Outbox rollback and observed pair-lock waiting with real counts `[0,1]`.
This does not certify revoke/source rollback races or automatic production wiring.
Original PR #36 final E2E was 484 PASS / 1 inherited DEBT-045 FAIL of 485.
That parallel audit was absent from PR #39 ancestry; its test/document commits
are now carried forward on `debt/d4-audit-evidence-reconciliation` without
merging GitHub PRs or changing runtime code. Current combined verification and
acceptance are pending; parent results are not current-branch certification.
Reconciliation PR #40 subsequently runs 10 migrated cases together (PASS) and
current full unit coverage 1101/1101. Full E2E first gives 467 PASS/25 FAIL;
separate serial repeat gives 491 PASS/1 known DEBT-045 FAIL of 492, zero skips.
Additional first-run failures remain an unexplained stability risk, not a fixed
defect. Both reports and gate limits are recorded in
[reconciliation evidence](D4_AUDIT_EVIDENCE_RECONCILIATION.md). Acceptance stays open.

The [Notifications follow-up](D4_NOTIFICATIONS_PERSISTENCE_REVIEW.md) reviews
owned preferences read/upsert, canonical defaults/order, owner GraphQL boundary
and Phase 15 delivery scope. Actual HTTP defaults/update/Audit case passes;
two new migrated cases prove default-read non-persistence and Audit failure
rollback for create/replacement. Full current packet E2E/acceptance is pending.

Follow-up at `87aec38`: the [Media operation review](D4_MEDIA_PERSISTENCE_REVIEW.md)
extends source tracing through repository methods, intake, retry/quarantine,
HTTP/GraphQL mappings and Worker persistence. It confirms DEBT-063 through actual
built processor/store and migrated PostgreSQL; runtime correction is not part of
that audit. This does not retroactively make the original tranche exhaustive or
waive pending Media concurrency, capability revocation and ownership checks.

Reconcile every remaining source/method across all seventeen features, Core,
root adapters, stateless owner helpers and all fourteen Worker sources. Review
every producer payload/retention path and actual rollback/replay/lifecycle behavior.
The scope above deliberately has per-operation evidence instead of upgrading a
lexical scan to a green architecture certificate. D4.4 surfaces/ORM isolation,
D4.5 enforcement/acceptance, D5–D7, stack audit and Phase 11 brainstorm remain.
