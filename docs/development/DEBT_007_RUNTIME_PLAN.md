# DEBT-007 — Detailed delivery implementation plan

Status: design proposal; runtime implementation and activation require separate acceptance.
Source checkpoint: accepted main `a715ece`; prepared on 2026-10-28.

## Approved decisions

The owner approved detailing an API-owned headless Nest consumer, a separate
gamification queue and independent durable routing accounting. Existing owners
retain their rules and effect idempotency. Activity consumer identity
`dss.worker.integration-events.v1` and existing Outbox.PUBLISHED semantics remain
unchanged. Only new events from an explicit activation boundary are admitted;
historical replay/backfill is a separate controlled package. Existing balances
and markers are not recalculated.

This plan extends `DEBT_007_EVENT_DELIVERY_DESIGN.md`; its historical proofs remain
historical. Neither document constitutes evidence that automatic delivery works.

Later owner decisions accepted this plan in PR100/merge625d1b9 and separately
authorized package A (owner runtime assemblies) and A.1 (failed Prisma connect
cleanup). Their [implementation boundary and evidence](DEBT_007_RUNTIME_ASSEMBLIES.md)
remain a separate candidate awaiting full verification/acceptance. Routing,
queue activation and historical backfill are not authorized by A/A.1.

## Process and ownership

Add a separate entrypoint to the API-owned build artifact using a Nest application
context, without an HTTP listener. Do not bootstrap AppModule: it starts unrelated
presentation and infrastructure. Do not import QueueModule wholesale: its runner
would start the existing dispatcher. Do not move scoring rules into the ESM
Worker or duplicate them in SQL.

Points, Levels and Achievements need owner-local runtime assemblies exposing only
named consumption capabilities. Their current modules include GraphQL resolvers;
extracting a reusable provider assembly must preserve the existing API bindings
and avoid creating duplicate repository/service instances. Root composition binds
recipient existence and authoritative Points balance through narrow ports. An
ID-only Users reader must preserve existence for every existing account state;
it must not introduce ACTIVE filtering. The current broad
GamificationIntegrationModule and UsersModule are not suitable headless imports.

Before implementation acceptance, prove the minimal provider graph with a
bootstrap/shutdown characterization: no HTTP listener, existing queue runner,
GraphQL schema generation, mail worker or unrelated scheduled task. Verify clean
Redis/Prisma/queue shutdown and failed-start cleanup. The bounded diagnostic below
proves only current constructor composition and successful Prisma lifecycle;
production runtime assembly, Redis/queue lifecycle and failed-start cleanup
remain unproven.

### Constructor dependency inventory

The following is source inspection, not a successful Nest bootstrap:

| Existing provider                     | Direct requirements                                                               | Headless implication                                                                    |
| ------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| CommunityPointsService                | Points repository; recipient existence                                            | Owner-local consumption facade can reuse the service                                    |
| LevelsService                         | Levels repository; Points balance; recipient existence                            | Root supplies the existing scalar balance adapter                                       |
| AchievementsService                   | Achievements repository; recipient existence                                      | No title service is required by this constructor                                        |
| Points and Levels Prisma repositories | PrismaService; AuditWriterService; OutboxWriterService                            | Share core infrastructure without importing queue runners                               |
| PrismaAchievementsRepository          | Same infrastructure; MANUAL_AWARD_TRANSACTION                                     | Automatic consumption still needs this constructor dependency satisfied                 |
| PrismaManualAwardTransaction          | PrismaService; PrismaManualAwardWriter; PrismaTransactionalProfileExistenceReader | Existing narrow root unit of work can satisfy the dependency without CustomTitlesModule |
| PrismaManualAwardWriter               | AuditWriterService; OutboxWriterService                                           | No additional feature service dependency in its constructor                             |
| Prisma client options provider        | ConfigService with DATABASE_URL                                                   | Explicit minimal configuration and real lifecycle verification remain necessary         |

Do not satisfy MANUAL_AWARD_TRANSACTION with a no-op implementation merely because
automatic jobs do not call manual award. Preserve the real composition or
separately justify an owner-local repository split. No such split is authorized
by this inventory. Existing recipient and balance adapters forward failures and
do not cache; the future runtime assembly must retain those properties.

### Bounded constructor/lifecycle diagnostic

On 2026-10-28, a local diagnostic loaded current source through ts-node and built
three test-only owner modules from existing module provider metadata, excluding
their resolvers. Root bindings used the real manual-award transaction/writer and
transactional Users existence reader, plus the existing scalar adapters. No
production module metadata or exports were modified.

Nest createApplicationContext succeeded against disposable loopback dss_test on
5434, Prisma healthCheck returned up, context.close completed and the process
exited 0. The inspected module container had 54 provider entries and no AppModule,
QueueModule, UsersModule, CustomTitlesModule, GraphQLModule or ScheduleModule;
provider checks excluded resolvers, dispatcher, registry and processors. The
three owner services and real manual-award transaction were present. No consume
method, queue connection or domain effect was invoked.

This is not the future named-capability assembly, a production build test,
queue-shutdown proof or event-delivery regression. The local ignored diagnostic
is retained outside Playwright cleanup:

- `node_modules/.cache/debt007-provider-probe.cjs`, SHA256
  `6050dc923344a051aeeb049f4bb68f64fadbdb36f7445073202ff2341799a9cb`;
- `node_modules/.cache/debt007-provider-probe.log`, SHA256
  `94507cc7f43e0b5aa21d8f194f5954887d22aae950468f54ef965fef54b45f5a`.

These ignored artifacts are local evidence, not Git-recoverable deliverables.
Permanent bootstrap/isolation tests belong to the reviewed runtime package.

## Durable routing protocol

Introduce additive destination-owned routing storage, uniquely keyed by original
Outbox event ID and destination. Keep canonical source envelopes and IDs. Routing
state describes destination admission/publication, not completed domain effects.
Use independent pending/claimed/published state, attempts, availability, failure
details and unique claim tokens. Completion and failure updates must compare the
current claim; recovery invalidates old tokens. Queue submission can still happen
twice after an uncertain acknowledgement: delivery remains at least once.

The existing dispatcher continues publishing to its existing integration queue.
Its PUBLISHED value still means that queue submission succeeded. Gamification
must not require Activity delivery to succeed, nor reinterpret PUBLISHED as
completion of both destinations. Reconcile eligible committed canonical Outbox
rows regardless of their legacy publication state.

Admission uses an indexed anti-join against existing routing rows, with bounded
batches and deterministic ordering. Do not advance a sole createdAt/ID high-water
cursor: a long transaction can commit an older row after the cursor advanced.
Do not conceal that loss behind a bounded lookback. Prove the chosen index/query
plan and reconciliation cost with representative retained history before enabling
the scanner. Batch size limits work per pass, not the eventual result set.

Proposed schema responsibilities are activation configuration, destination routing
and destination failure records. Exact Prisma models, indexes, claim SQL,
retention and referential deletion behavior remain implementation design outputs;
no migration has been authored or executed by this package.

## Activation boundary and rollback

Use one persisted activation record, not a timestamp regenerated on startup.
Separate preparation, activation and pause. The owner approved an explicit UTC database
cutoff against canonical Outbox.createdAt, with equality admitted; occurredAt
continues to describe business time and is not an admission coordinate. Under this
definition, a pre-cutoff row committed late remains excluded; a post-cutoff row
committed late remains discoverable. The comparison is createdAt >= persisted
cutoff; this exact coordinate and late-commit behavior were explicitly accepted
on 2026-10-28. Persistence and operational activation are not implemented here.

Record the cutoff, destination version and operator decision durably. Preflight
must report excluded historical counts, pending new counts, configured matching
rules and enabled producers without reading content into logs. Do not rewrite
source rows, balances or historical markers. Restart/redeploy cannot move the
cutoff. Pausing stops new processing and preserves backlog; already committed
effects stay committed. A code rollback is not an economic rollback. Resuming
uses the same boundary. Backfill requires its own reviewed manifest and package.

## Consumption and derived events

One event is offered to the explicit Points/Levels/Achievements capabilities under
a versioned gamification consumer identity. Owners decide applicability; a routing
allowlist must include their actual supported input events and emitted second
hops. Inventory rule-configurable inputs before choosing an allowlist: silently
dropping a configured event is unacceptable. Validate configuration cycles before
activation; do not invent a hop limit that discards effects.

Preserve Points recipient precedence, value matching, first non-IGNORED rule
behavior, daily caps, source reversal handling and atomic effect/Audit/Outbox
transactions. Levels consumes the durable Points awarded/reversed events on a
second Outbox-to-queue hop and reads authoritative balance. Achievements retains
per-rule transactions and idempotency. A failure after one owner or rule commits
replays the envelope; prior owner effects must deduplicate. An outer processed
marker is not a substitute for these owner guarantees and does not make the
sequence atomic.

A new reputation reversal can reference an excluded historical source. Current
Points reverseSource records the revoked source and reverses existing matching
entries; absent originals produce no synthetic debit or award. Preserve that
behavior and characterize both existing and absent historical entries. Excluding
historical event delivery must not bypass a valid new reversal. Also verify
reversal-before-original behavior for each owner rather than assuming that a
Points marker proves Achievements ordering.

Envelope validation failures and owner failures must be observable, with bounded
attempts and isolated failed delivery. Unsupported events need an explicit
successful no-op classification; malformed supported inputs must not be silently
acknowledged. Do not cache authorization/account facts across jobs or alter
existing formulas and rule configuration as part of wiring.

## Failure and retry isolation

The existing QueueOperationsService retries the Activity queue and resolves
legacy dead-letter rows by eventId alone. Therefore new gamification failures
must not be written into that legacy resolution scope. Prefer additive
destination-owned failure records and separate queue/DLQ operations. Preserve
historical v1/v2 Activity markers and dead letters without renaming or deleting.

Provide an operational CLI or service boundary, not a new Command Deck screen:
inspect destination failure, retry its original immutable envelope and resolve
only the corresponding destination record after the defined successful action.
Specify whether resolution means resubmission or successful consumption; do not
label resubmission as a completed award. Stable BullMQ IDs are destination-local;
retained failed/completed jobs require an explicit retry protocol, not blind add.

Negative controls must prove that Activity retry cannot resolve, requeue or mark
gamification delivery, and the inverse. Queue/DLQ publication failure must leave a
durable recoverable record. Never log credentials, unrestricted payloads or user
content as failure diagnostics.

## Implementation packages and acceptance

| Package | Scope                                                   | Required evidence                                                                                     |
| ------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| A       | Minimal owner runtime assemblies and headless lifecycle | Provider graph, API provider identity, shutdown and no unrelated startup                              |
| B       | Activation and destination routing persistence          | Fresh migration and zero drift; claim/recovery races; late commits; scanner query plan                |
| C       | Queue consumer and real owner effects                   | Producer→routing→queue→Points→derived event→Levels; Achievements; rollback/replay and partial success |
| D       | Destination operations and activation runbook           | Independent failure/retry controls, pause/resume, immutable cutoff and historical exclusions          |

These are reviewable stages of one proposed implementation, not permission to
start them. No activation before all required stages and owner acceptance.

Use disposable migrated PostgreSQL and Redis. Deterministic regressions must
cover concurrent duplicate delivery, stale claim completion, enqueue uncertainty,
restart between owner commit and outer marker, daily cap contention, source
reversal ordering, missing recipient, unsupported/malformed input, isolated retry
and second-hop delivery. Preserve existing Activity regressions and API contracts.
No sleep, timeout inflation, hidden result cap or retry-to-green.

Each runtime package requires format, lint, typecheck, tests, Prisma validation and
drift checks, architecture checks, generated API consistency, build and the full
quality gate including coverage, unskipped E2E and Web smoke. Record exact head,
CI and local evidence; this document does not inherit a green gate from main.

## Decisions still required before runtime

Finalize the additive schema and scanner performance budget; prove the actual
named-capability runtime graph and failure lifecycle; agree on configured-event
admission and cycle handling; finalize isolated
retry/retention semantics. These are bounded implementation decisions, not a
request to change the stack, scoring formulas or Phase 11 scope. DEBT-007 and D7
remain open.
