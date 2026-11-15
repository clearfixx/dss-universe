# DEBT-007 — Package B schema and transaction protocol

Status: owner-accepted design PR103/merged992de6; runtime B separately authorized, activation not authorized.
Baseline: main `c2a242b`, owner-accepted routing design PR102.

This makes the [accepted discovery design](DEBT_007_ROUTING_DESIGN.md) concrete.
Package B will provide persistence and explicitly called repository operations.
It will not import a queue, start a scheduler, expose an HTTP/GraphQL endpoint,
load owner consumers or activate a destination on startup. Those remain C/D.

## Ownership and files

Root `composition/gamification-delivery` owns the cross-infrastructure transaction
protocol. Separate files contain contracts, discovery, publication claims,
activation persistence and failure persistence; DTOs contain no SQL or policy.
Core Events remains owner of the canonical Outbox envelope. A narrow
infrastructure-only source query adapter supplies its coordinate/read operations
inside root-owned transactions. It must not export a Prisma client through a
business contract. Points/Levels/Achievements are absent from B's provider graph.

Do not extend QueueRegistryService or import the existing QueueModule. There is
no generic event bus framework, feature service export, new staff permission,
Command Deck UI or change to owner scoring formulas in this package.

## Concrete additive storage proposal

All new timestamps are `TIMESTAMP(3)` UTC. New SQL writes use
`timezone('UTC', clock_timestamp())`, not the transaction-start default, for
operational times. Existing Outbox timestamps/defaults stay unchanged. Source
admission uses its stored createdAt coordinate exactly as approved.

The only destination key accepted in this version is `gamification.v1`. This is a
transport destination, not the existing Activity consumer name or a claim that
the future gamification effect-marker identity is finalized.

| Prisma model / SQL table                                           | Exact proposed columns beyond timestamps                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GamificationActivation / gamification_activations                  | destination VARCHAR(64) PK; state PREPARED/ACTIVE/PAUSED; cutoff TIMESTAMP(3) nullable; activatedBy VARCHAR(200) nullable; changedBy VARCHAR(200) required; revision BIGINT default 0; createdAt/updatedAt                                                                             |
| GamificationDiscovery / gamification_discovery                     | destination PK/FK; forwardAt/forwardId nullable pair; sweepAt/sweepId nullable pair; upperAt/upperId nullable pair; epochOpen BOOLEAN default false; epoch BIGINT default 0; examined BIGINT default 0; epochStartedAt/lastProgressAt nullable; updatedAt                              |
| GamificationDelivery / gamification_deliveries                     | destination + eventId composite PK; state WAITING/CLAIMED/QUEUED/BLOCKED; availableAt required; claimToken UUID nullable; claimedAt/leaseUntil nullable; claimCount BIGINT default 0; cycle INTEGER default 0; cycleAttempts INTEGER default 0; queuedAt nullable; createdAt/updatedAt |
| GamificationPublicationFailure / gamification_publication_failures | id UUID PK; destination/eventId FK; claimToken UUID unique; cycle/cycleAttempt required; code QUEUE_ADD_FAILED/CLAIM_EXPIRED; failedAt required                                                                                                                                        |

All coordinate IDs and eventId are native UUID, matching Outbox.id. Actor strings
are opaque operational identities, never password/token/IP/payload storage; they
do not require a Users dependency. Operation authorization and a trusted operator
identity belong to D, not arbitrary client-supplied strings. B tests invoke these
operations directly; there is no public command or implicit SYSTEM activation.

Foreign keys use ON DELETE RESTRICT and ON UPDATE RESTRICT:

- discovery.destination and delivery.destination reference activation.destination;
- delivery.eventId references canonical outbox_events.id;
- publication failure references its composite delivery identity.

Keep rows and failures; no cascade, cleanup or historical migration edit. Source
deletion while a delivery reference exists must fail. This deliberately requires
a reviewed retention protocol before pruning, rather than silently losing the
original envelope. References do not themselves prevent edits to envelope fields;
source immutability/consumer validation remains a separate C/D requirement.

### Structural constraints and guards

Use closed Prisma enums plus SQL CHECK/trigger invariants, with explicit names
and regression tests. Prisma schema carries all representable types/defaults/
indexes; migration-only CHECKs/triggers get dedicated SQL regression coverage.

1. Destination equals gamification.v1. All counters are nonnegative; cycleAttempts
   is at most the configured publication budget in normal operations.
2. PREPARED has NULL cutoff and activatedBy. ACTIVE/PAUSED have both non-NULL.
   Actor strings are trimmed/nonempty. Identity, createdAt and established
   cutoff/activatedBy cannot change. A guard rejects activation deletion and
   transitions back to PREPARED. ACTIVE↔PAUSED is allowed; activation occurs once.
3. Every coordinate pair is entirely NULL or entirely present. Closed epochs
   have NULL sweep/upper/start time. Open epochs have upper/start time; a nullable
   sweep means no row examined yet. Non-NULL sweep is at most upper.
4. Only CLAIMED has a non-NULL token, claimedAt and leaseUntil; all three are
   present together and leaseUntil > claimedAt. Only QUEUED has queuedAt.
5. Failure identity, attempt coordinates, code and failedAt are append-only;
   no raw exception message, stack trace or canonical payload is persisted.

Cross-row source eligibility and cursor advancement are repository transaction
invariants, not falsely advertised as ordinary CHECK constraints. B has no
untrusted direct SQL endpoint. DB owner/superuser tampering is outside these
application guarantees, as with existing operational storage.

### Indexes

Add Outbox(createdAt, id), preserving its existing status/aggregate/correlation
indexes. Add delivery(destination, state, availableAt, eventId) for pending work
and delivery(destination, state, leaseUntil, eventId) for recovery. The composite
PK supports dedup and destination-local identity. Add failure(destination,
failedAt, id) plus its unique claimToken. Do not add a payload/GiN index.

Migration acceptance includes fresh migrated schema and zero Prisma diff. The
source index can lock a populated table during ordinary CREATE INDEX; choose a
deployment window after measuring the actual table size and execution time.
Do not silently add CREATE INDEX CONCURRENTLY to a transactional migration or
claim that a disposable small-table test proves production deployment safety.

## Activation transactions

Preparation explicitly inserts PREPARED plus empty discovery state and writes
the operator audit in one transaction. It is idempotent for an existing identical
destination and does not replace its actor, revision or cutoff. Migrations/seed/
module startup create no activation row or transition.

Activation locks the control row FOR UPDATE, requires PREPARED and a successful
reviewed preflight, stores UTC database wall time once, changes state to ACTIVE,
increments revision, writes an audit record and commits. Concurrent activation
has one winner; the loser reports ALREADY_ACTIVATED without rebasing. Preflight
must establish UTC producer conventions and inspect configuration before D can
call this operation; B's fixture invocation is not operational approval.

Pause/resume lock the same row FOR UPDATE, require the expected revision, update
only state/operator/revision/updatedAt and append audit atomically. Stale operator
requests fail rather than overwriting a newer choice. Resume preserves cutoff,
discovery cursors, deliveries and owner effects.

## Discovery transactions

Use existing default Read Committed, not a global isolation change. Lock order:
activation FOR SHARE, then discovery FOR UPDATE. Missing/PREPARED returns NOT_READY;
ACTIVE and PAUSED allow reference discovery from the established cutoff. No
destination lock is acquired after discovery/delivery locks. Each operation is
short and contains no network IO beyond its own PostgreSQL statements.

For each lane, select at most batchSize source keys with explicit matching
timestamp types and deterministic `(createdAt, id)` ordering. Build SQL variants
for absent/present cursors instead of assuming nullable-OR predicates will get
the same index plan under prepared statements. Select no payload or profile.

Inside the same transaction:

1. For a new reconciliation epoch, capture the actual greatest eligible visible
   key. If none exists, close/count the empty epoch and return; never interpret
   NULL as an unlimited upper bound. Otherwise fix upper and epochStartedAt.
2. Materialize the bounded candidate key list. On conflict, keep existing delivery
   rows unchanged, including CLAIMED/QUEUED/BLOCKED attempts and timestamps.
3. Insert WAITING references for missing keys, using UTC database time for their
   availability. Advance the lane cursor to the last examined source key copied
   within SQL, even if the insert count is zero. Increment examined/progress.
4. Reconciliation closes/reset its window when it reaches upper or a subsequent
   bounded query finds no remaining visible key. Late prefix commits belong to
   the next epoch. Forward discovery keeps its cursor on an empty result.
5. Commit inserts and progress together. Any error rolls both back. A crash after
   commit may repeat scanning after recovery, but the PK prevents duplicate rows.

Do not run both lanes by reading a stale copy of discovery outside the lock. A
second materializer waits, then uses the committed current cursor. Scheduling
must reserve one reconciliation batch per forward batch; it cannot run only the
forward lane while that lane remains busy. B exports operations, not a runner.

## Publication claim protocol

Proposed initial parameters for later runner review: source batch 256 per lane,
publication claim batch 32, lease 60 seconds, five attempts per explicit retry
cycle, exponential delays 1/2/4/8 seconds before the next attempt. These are new
destination parameters, not changes to existing timeouts or Activity settings.
They are not measured capacity claims; benchmark evidence precedes activation.

Claim transaction: lock activation FOR SHARE, read its current state, require
ACTIVE, then select due WAITING delivery rows ordered by availableAt/eventId FOR
UPDATE SKIP LOCKED. Set a fresh application-generated UUID per row, claimedAt and
leaseUntil from one database clock value, increment both claimCount and
cycleAttempts, and commit. Return only destination/eventId/attempt coordinates.
Batch limits must be positive and bounded; invalid values are rejected before SQL.

FOR SHARE conflicts with an operational state update. Thus pause either commits
before a claim checks ACTIVE, or waits until that claim commits. This supplies the
soft-pause admission boundary; it does not cancel already admitted queue calls.
[PostgreSQL row locking](https://www.postgresql.org/docs/17/explicit-locking.html).
SKIP LOCKED is used only for competing work claims, not an authoritative total or
ordered business read.
[PostgreSQL SELECT locking clauses](https://www.postgresql.org/docs/17/sql-select.html).

The caller submits a reference to the future destination queue outside the DB
transaction. C specifies the exact queue/job contract; B opens no Redis connection.
Stable event IDs do not promise exactly-once delivery.

Success uses UPDATE WHERE destination/eventId/state=CLAIMED/claimToken match.
It changes to QUEUED, sets queuedAt, clears claim coordinates and returns the
affected count. Zero means ownership lost, not success. It never changes owner
markers or claims that an award occurred.

Failure first conditionally updates the same current claim. Only its winner
inserts one bounded failure row in that transaction. Below budget, return to
WAITING with the proposed backoff and clear claim coordinates; at budget, change
to BLOCKED. Adding BLOCKED is an explicit refinement of PR102's proposed three
publication states so bounded exhaustion cannot masquerade as a due WAITING job.

Recovery selects expired CLAIMED rows FOR UPDATE SKIP LOCKED, records CLAIM_EXPIRED
and applies the same retry/budget transition. It works while ACTIVE or PAUSED;
pause must not strand stale leases. Recovery does not increment attempt counters
again: each claim already counted once. A late success/failure loses its token
comparison and cannot modify the recovered row or append an extra failure.

Expiry alone is not a fencing operation: if no recovery changed the token, a
late completion can still win. The linearization is the conditional DB update.
An old queue call may finish after recovery; the protocol fences DB state, not
network side effects. Concurrent acknowledgement/recovery has one winner.

Manual retry belongs to D: only an authorized BLOCKED delivery can start a new
cycle, resetting cycleAttempts while preserving monotonically increasing
claimCount and immutable prior failures. QUEUED must not be blindly reset: a
consumer may already have committed effects. Consumption failures and their
retry/completion state are separate C/D records, not publication failures.

## Proposed B acceptance matrix

| Operation           | Required deterministic evidence                                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Activation          | Concurrent once-only stamp, immutable cutoff/actor, no startup/seed activation, audit rollback, stale revision rejection                                              |
| Discovery           | Inclusive equality/zero UUID, late transaction commits, empty epochs, growing tail, duplicate materializers, insert+cursor rollback, no reset on conflict             |
| Claim               | Concurrent disjoint claims, ACTIVE gate linearization, PAUSED denial, no payload disclosure, parameter validation                                                     |
| Completion/recovery | Stale token success/failure rejected, atomic single failure, fifth-attempt blocking, exact backoff, expiration without sleeps, recovery during pause                  |
| Retention/isolation | FK blocks source deletion, history guards, old Activity rows/markers/DLQ untouched, no Redis or consumer startup                                                      |
| Scale/deployment    | Representative retained-history query plans including many already-routed rows; bounded key batches; measured complete-epoch duration; source index deployment review |

DB concurrency tests use separate connections and observed row locks/barriers;
clock cases set controlled timestamps rather than sleeping. Schema experiments
are not substitutes for testing the real migrated repository once implemented.

Before activation, report measured rows/buffers/time, dataset distribution, epoch
work and environment. No arbitrary SLA is declared here. Source batch and
cadence can be tuned from evidence without truncating the result set. If the
platform cannot finish reconciliation within an accepted operational budget,
do not enable it and do not conceal the problem with a lookback window.

## Approval boundary

The proposed runtime B scope is additive schema/indexes/guards, repositories and
their deterministic tests, with audits for explicit control transitions. It has
no public activation tooling, automatic runner, queue, owner consumption,
historical replay or scoring changes. Full quality/coverage, migration/drift,
architecture, generated API, build, unskipped E2E and no-retry Web smoke are
mandatory before its own acceptance.

The owner subsequently approved that runtime scope, the four-state bounded
publication protocol, proposed parameters and soft-pause semantics. Its
[implementation/evidence](DEBT_007_ROUTING_PERSISTENCE.md) remains a separately
verified package, not inherited acceptance from this design. Operational activation remains a
later separate decision after C/D and producer/configuration/retention review.
