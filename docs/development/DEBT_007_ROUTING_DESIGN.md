# DEBT-007 — Routing persistence design, package B

Status: owner-accepted design/characterization in PR102/mergec2a242b; not runtime authorization.
Source: accepted main `2c42e89`, following owner-accepted PR101 (A/A.1).

## Boundary and evidence

A/A.1 is accepted and merged. It supplies reusable owner assemblies and failed
Prisma-connect cleanup; it does not start routing, queues or automatic awards.
This document refines the [accepted delivery plan](DEBT_007_RUNTIME_PLAN.md).
No production schema, migration, dispatcher or activation command is changed.
DEBT-007, D7 and operational activation remain open.

The [concrete package B schema and protocol](DEBT_007_ROUTING_PROTOCOL.md) is a
separate implementation proposal; its approval boundary is explicit.

`apps/api/test/gamification-routing-characterization.e2e-spec.ts` contains four
experiments using a private schema populated by the existing migrations. They
prove transaction-clock/type behavior, a real late-commit cursor omission and
finite reconciliation windows. They do not exercise a future routing repository,
claim concurrency, queue delivery, retention or production-scale performance.

## Canonical admission coordinate

Keep the approved rule: canonical Outbox `createdAt >= persisted UTC cutoff`,
including equality, irrespective of legacy PENDING/PROCESSING/PUBLISHED status.
Do not use occurredAt, insertion wall time, commit order or a rolling lookback.

The existing migration defines createdAt as `TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP`.
PostgreSQL CURRENT_TIMESTAMP denotes transaction start. Thus an insert made in a
transaction begun before activation may have a pre-cutoff coordinate even when
insertion and commit happen later. This follows the approved stored-coordinate
rule; changing the producer clock would be a separate contract change.
[PostgreSQL datetime functions](https://www.postgresql.org/docs/17/functions-datetime.html).

Propose cutoff storage as UTC `TIMESTAMP(3)` matching the source's physical type.
Stamp it once from database wall time explicitly converted to UTC. A preflight
must establish UTC source-writer/session conventions; refuse activation if they
cannot be established. Do not silently reinterpret historic rows. Comparing
timestamp without time zone with timestamptz interprets the former using the
session TimeZone: the characterization deliberately demonstrates a different
result in America/New_York. Keep SQL coordinates in matching types and copy
cursor values database-to-database rather than through JavaScript Date parsing.
[PostgreSQL datetime types](https://www.postgresql.org/docs/17/datatype-datetime.html).

## Discovery: forward lane plus complete finite sweeps

A sole increasing `(createdAt, id)` cursor loses rows committed behind it. A
fixed lookback also loses sufficiently late commits. An anti-join with LIMIT on
unrouted rows alone does not bound examined history when most rows are routed.

Propose two independently persisted discovery lanes:

1. A forward keyset lane gives normal newly committed rows low discovery latency.
2. A reconciliation lane repeatedly scans the entire admitted coordinate range.
   Each epoch captures one actual greatest visible `(createdAt, id)` row as its
   fixed upper bound. It finishes that finite window, then starts a fresh epoch
   from the cutoff. Rows committed behind its cursor are found in a later epoch.

Each transaction first selects a bounded batch of source keys, ordered by
createdAt/id, then bulk inserts missing destination references with conflict
deduplication. The batch bound limits selected source keys, not total lifetime
results; it is not a guarantee about PostgreSQL pages examined. Advance the cursor
after the last examined key even when every selected row was already admitted.
Reference inserts and cursor advancement commit together. A failed transaction
advances neither. No external queue/network call runs inside discovery locks.

Start with a NULL coordinate pair, not cutoff plus a fabricated zero UUID: a real
zero UUID at exact cutoff must remain eligible. Cursor pairs must be both NULL
or both present. Capture the upper bound with ORDER BY both columns DESC LIMIT 1;
separate MAX expressions can synthesize a nonexistent key. An empty epoch ends
immediately; NULL upper must never accidentally mean an unbounded sweep.

Fair scheduling reserves reconciliation work even while the forward lane is
busy. A growing tail cannot extend the current reconciliation epoch. Eventual
discovery assumes retained source rows, continuing completed epochs and working
infrastructure; it is not a fixed latency promise under unlimited growth or
outages. Expose epoch age, scan work, last progress and backlog age. Before
activation, representative retained-history EXPLAIN/load evidence must establish
batch sizes, cadence and acceptable sweep duration. These numbers are not yet
measured or approved.

This refines the accepted indexed anti-join approach: deduplication remains, but
bounded source traversal precedes it. It requires design acceptance before runtime
implementation. No producer dual write or database capture trigger is proposed.

## Proposed additive persistence responsibilities

Names below describe responsibilities; they are not an authored Prisma schema.

| Storage             | Owns                                                                                                                     | Required invariants                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| Activation          | Fixed destination/version, PREPARED/ACTIVE/PAUSED, UTC cutoff, operator record                                           | PREPARED has no cutoff; ACTIVE/PAUSED require it; activation stamps once; resume never rebases   |
| Discovery           | Forward cursor, reconciliation cursor and fixed upper, epoch/revision                                                    | Paired coordinates; finite epoch; cursor changes atomic with reference insertion                 |
| Delivery            | Original source UUID, independent publication state, availability, claim UUID/time, attempts, queue acknowledgement time | One reference per source/destination; CAS claim ownership; queue acknowledgement is not an award |
| Destination failure | Delivery/stage/attempt and bounded safe error code                                                                       | Separate from legacy Activity dead-letter resolution; no unrestricted payload or credentials     |

The source needs a `(createdAt, id)` index. Delivery needs unique source/destination
identity and a claimable-state/availability index. Exact names, predicates,
foreign keys, CHECK constraints and plans require migration review and tests.
Keep activation and hot discovery progress in separate rows. Discovery acquires
activation shared access before its discovery update lock; operational changes
use the same order. Serialize competing discovery transactions through the
discovery row. Do not hold these locks during owner effects or queue submission.

Store references, not duplicate unrestricted envelopes in the routing table or
queue. An Outbox foreign key must prevent source deletion while references need
it. Retention must be coordinated explicitly before enabling production cleanup;
this package does not invent a retention deadline or delete source history.
Canonical-envelope immutability/validation and consumer payload projection remain
required C/D design outputs, not guarantees supplied by a reference alone.

## Independent publication and recovery

Proposed publication states are WAITING, CLAIMED and QUEUED. Claim with a fresh
UUID attempt token and database time. Success/failure update only when source,
CLAIMED state and attempt token still match. Recovery clears/replaces the token,
so an old attempt cannot overwrite the new state. Exact leases/backoff/attempt
budgets remain to be specified and tested; do not inherit them silently from the
Activity dispatcher.

Queue submission is outside the DB transaction, using a destination-local stable
job ID. An uncertain acknowledgement can produce another submission; owner
idempotency remains mandatory. QUEUED means queue acknowledgement, not completed
Points/Levels/Achievements effects. The existing Outbox.PUBLISHED and Activity v1
identity keep their meanings and historical data.

Legacy retry resolves legacy dead letters by event ID, so new destination failures
must use separate storage and operations. Retained completed/failed BullMQ jobs
need a defined explicit retry protocol in C/D; blind add is insufficient. Do not
mark a domain failure resolved merely because a job was resubmitted.

## Activation, pause and later consumer decisions

Preparation must not activate through migrations, seed or application startup.
Explicit owner-approved operations stamp the one cutoff after preflight. A
proposed soft pause stops new publication/consumption claims; claims already
admitted may finish. Discovery may continue preserving references while paused.
This is not instantaneous cancellation or an economic rollback. Hard drain would
require a separate protocol. The owner must accept these pause semantics.

Discovering reference IDs is separate from forwarding payloads to owner consumers.
Before activation, package C must inventory configured inputs, derived events,
recipient/reversal semantics and cycles. No silent event allowlist, hop cap or
configuration restriction is authorized here. Unsupported no-op completion is
not an award receipt. Existing balances and historical markers remain unchanged;
historical replay/backfill requires a separate reviewed package.

## Verification and implementation gate

Focused characterization: four tests passed on disposable PostgreSQL 5434;
TypeScript compilation passed. The first restricted invocation failed with local
TCP EACCES before fixture setup; an authorized invocation reached the DB and
passed. No test timeout, retry policy or assertion was weakened.

Future B implementation requires explicit approval of this design, exact schema
and pause semantics. It must prove migrated fresh schema and zero drift; cursor
rollback/concurrent materializers; equality, empty epochs and late commits;
claim/recovery/stale completion; retained-history query plans; reference-retention
behavior and absence of Activity interference. Full quality/coverage, generated
API consistency, build and CI are required for package acceptance. Focused tests
here do not establish a green full gate or authorize B/C/D activation.
