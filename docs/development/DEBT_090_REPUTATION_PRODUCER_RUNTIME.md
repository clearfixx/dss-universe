# DEBT-090 — Inactive P1 Reputation producer

Base: owner-accepted P1 design PR148, merged as `3fc470f`.
Status: separately authorized implementation candidate; full gate, CI and runtime
acceptance pending. [Accepted design](DEBT_090_REPUTATION_PRODUCER_DESIGN.md).
This is producer persistence and command preparation, not automatic delivery.

## Implemented ownership

Reputation retains three private tables: immutable event bindings, immutable
ENTRY/EVENT qualification facts, and a monotonic current-original pointer.
One new forward migration adds these tables, composite scope FKs, checks and
guards plus Core's exact-coordinate candidate index. Historical migrations,
O1 indexes, existing ledger rows, markers and awards are unchanged. Only the
disposable test database receives local migration deployment during validation.

The current Reputation writer keeps its pair/reversal guards, duplicate short
circuits, INSERT, public response composition, Audit and Outbox order. It appends
qualification evidence before committing that same default-isolation transaction.
The event factory allocates the canonical event ID once. Any subsequent failure
rolls back ledger, Audit, Outbox, facts and pointer. Unknown failures retain their
identity. No consumer or queue is called by this write path.

Core owns bounded canonical reading and payload parsing. It returns only a
descriptor-approved scalar projection, with an explicit invalid-payload state;
it does not cast string`"1"` to number1. The original candidate query uses exact
producer/aggregate/event-name coordinates, ordered by ID with LIMIT2. Ambiguity
is observed before version/category/payload validation, not hidden by a filtered
candidate or timestamp selection. There is no cross-owner Outbox FK or new
retention policy; canonical evidence missing at preparation blocks the command.

Root supplies the Core legacy lookup as a narrow technical callback. Reputation
never reads a Core delegate. The inactive root adapter reads the owned view and
canonical fields in one **new Repeatable Read** transaction and prepares the
named O1 input. Existing writers retain default isolation/timeouts. Domain view
types contain no Prisma, Nest or sibling domain types. Explicit technical exports
remain unavailable to feature applications and foreign feature implementations.

## Lifecycle and legacy semantics

Native original: ENTRY Q:r1. Reversal: ENTRY W:r2 references the exact original Q,
while its independently rewardable EVENT Q:r1 uses `@event`/reversal event ID.
The canonical reversal aggregate remains the compensating ledger entry ID;
`reversesEntryId` remains the original ID. No payload keys, event versions,
formulas, recipient rules or public success responses are changed.

The owned view includes current original withdrawal, even when preparing an
older original event; a reversal view contains Q,W,E. At most three facts cross
the root boundary, with an explicit contribution pointer. The actual owned SQL
uses indexed predicates and a fourth-row corruption sentinel, not an arbitrary
history scan or a silent result cap.

For a legacy original without a pointer, one exactly matching canonical event
can be adopted as immutable VERIFIED_LEGACY context during reversal. No old event,
ledger row, award or marker is rewritten. A missing/ambiguous/malformed result
preserves business reversal and records BLOCKED_LEGACY with no invented original
qualification. The event contribution cannot bypass that mandatory control.
A database lookup failure instead aborts the transaction; it is not absence of
evidence. Repair of blocked history still needs separately reviewed append-only
resolution. Existing unbound legacy rule awards still return
BLOCKED_LEGACY_MAPPING from O1: source context does not authorize award mapping.

New direct decisions use new ledger source identities. P1 adds no reinstatement
endpoint or artificial revision3. A later withdrawal may commit after a prepared
snapshot; this is not a distributed atomicity promise. Once O1 has accepted that
withdrawal, late fresh or previously prepared original commands cannot restore
its award. C2 must separately handle admission freshness, mappings and durable
CONTINUE progress; C3/D own delivery and activation.

## Verification boundary

Focused tests use actual migrated schemas, writers, canonical adapter and the
accepted headless Achievements wrapper. The wrapper is imported **only in the
integration fixture** for named consumer invocation; API production imports do
not acquire automatic consumption. Existing Reputation HTTP tests also check
the committed native pointer and exact compensating Outbox payload.

The matrix covers both signs, Q→W, W before late original, independent reversal
awards, manual preservation, verified pre-cutoff context without backfill,
unbound legacy awards, missing/duplicate/type/actor/version/category mismatches,
genuine post-persistence failures, query failure identity and immutable-history
violations. Existing actual PostgreSQL waiter tests retain both direct/reversal
schedules and add qualification postconditions. Snapshot comparisons now include
the new provenance records.

Repeatable-read proof checks PostgreSQL's actual `transaction_isolation` and
forwards the real canonical reader after a concurrent reversal and an explicit
synthetic canonical mutation. The prepared view sees its older coherent snapshot;
the subsequent view sees withdrawal. Fixture mutation is not normal producer
behavior or a claim of a current event-tampering incident.

Large storage fixtures contain2048 unrelated qualification histories and1024
same-coordinate candidates. EXPLAIN ANALYZE uses the actual production SQL
factories, without forced planner settings: source scans must use bounded
indexed work, candidate source rows≤2, producer source-node returned rows across
loops≤4 and filtered rows≤1. Root preparation is limited to12 captured Prisma
query events in that fixture. That counter excludes adapter-level transaction
control and server-internal trigger statements; it is not a complete wire-query
count or a latency SLA. Exact measurements and final gate/CI belong to the PR
and local proof receipt.

## Retained failed evidence

- The initial integration setup imported AppModule without the existing named
  headless wrapper:17 setup failures. The fixture now imports that wrapper;
  production registration is unchanged.
- The next run passed15/17. Two tests made incorrect observation assumptions:
  Prisma query events do not include all transaction-control SQL, and a foreign
  key does not guarantee waiting for an unpublished/uncommitted original ID.
  The replacement proves actual PostgreSQL isolation and snapshot behavior;
  a held creator plus exact P2003 counterproof preserves existing rejection
  before commit, followed by a successful native-pointer reversal after commit.
  No timeout, retry or production behavior is changed to satisfy the test.
- The first full focused matrix was45/56: those two checks plus nine storage
  setup failures caused by omitted existing Outbox.updatedAt in raw fixture SQL.
  The fixture now supplies that required field. SQL defaults were not altered.
- Strict lint caught untyped bound test methods and unnecessary casts; methods
  now retain explicit signatures and canonical projection uses scalar guards.
  Architecture export inventories are extended only by the reviewed named types
  and technical capabilities, not by wildcard or baseline exceptions.

Failed logs are retained alongside subsequent evidence. They are not called
runtime regressions resolved by unchanged reruns. No retries-to-green, raised
timeouts, weakened owner assertions or default-allow evidence path is added.

DEBT-090, DEBT-007 and D7 remain open. This candidate enables no queue, automatic
awards, activation cutoff, historical replay, frontend or Phase11 implementation.
