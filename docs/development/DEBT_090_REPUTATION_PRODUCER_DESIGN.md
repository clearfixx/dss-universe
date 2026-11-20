# DEBT-090 — P1 Reputation producer facts

Reviewed baseline: accepted main `a31b5fd`, including O1 / PR147.
Status: design/characterization accepted in PR148 at `0d77960`, merged as `3fc470f`.
That packet adds no runtime, migration, consumer activation or frontend change.
The owner separately approved the [inactive P1 runtime](DEBT_090_REPUTATION_PRODUCER_RUNTIME.md);
its implementation and acceptance evidence remain distinct from design approval.

## Existing behavior and ownership

Reputation is the first real reversible producer for the accepted
[qualified-owner contract](DEBT_090_QUALIFIED_OWNER_DESIGN.md).
Its direct and compensating ledger rows already commit with Audit and Outbox in
one root-owned transaction. Reputation owns the decision and its evidence;
Achievements owns qualification consumption and awards. Root connects narrow
capabilities; neither feature imports the other's service, DTO or repository.

| Existing operation | Actual identity and payload                                                                                                                         | P1 interpretation                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Direct decision    | `reputation.direct.changed.v1`, producer `dss.api.reputation`; aggregate `ReputationEntry` / original entry ID; payload exactly `recipientId,value` | Qualify that original entry, revision1                                                                    |
| Reversal           | `reputation.direct.reversed.v1`; aggregate is the **new compensating entry ID**; payload exactly `recipientId,value,reversesEntryId`                | Withdraw the original entry, revision2; independently qualify the reversal event as an event contribution |

Both event versions remain1, category `integration`. `actorId` is an envelope
field, not a new payload recipient key. Explanation stays in ledger/Audit and the
existing public response; the qualification view must not copy it or a profile.
Envelope `occurredAt` is allocated by the factory, not a ledger sequence.

The existing direct guard serializes actor/recipient cooldown decisions. The
reversal guard serializes a single original entry, backed by unique
`reversesEntryId`. A later legitimate direct decision has a new entry ID, even for
the same actor/recipient. There is no existing reinstate-original operation:
P1 must not invent revision3, an endpoint, or a publication workflow.

## Proposed private producer storage

Three additive Reputation-owned records, not Prisma/DDL in this packet:

| Record                         | Fields and invariants                                                                                                                                                                                                                                                                                                                         |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ReputationQualificationEvent` | UUID ID; unique ledger entry FK/RESTRICT; unique canonical event UUID; DIRECT or REVERSAL; version1; safe expected actor/recipient/value, original entry ID for reversal, occurredAt; provenance disposition NATIVE, VERIFIED_LEGACY or BLOCKED_LEGACY. Immutable after insertion. No free-form payload, explanation, credentials or profile. |
| `ReputationQualificationFact`  | UUID fact ID; event binding FK/RESTRICT; scope ENTRY or EVENT; original entry FK for ENTRY, null for EVENT; positive bigint revision; QUALIFY or WITHDRAW; qualification fact self-FK; contractVersion1. Exact fields immutable; an event may own more than one fact.                                                                         |
| `ReputationQualificationState` | One row per original entry FK/RESTRICT; state ACTIVE, WITHDRAWN or BLOCKED_LEGACY; qualification/current fact pointers and current revision; monotonically ACTIVE:r1→WITHDRAWN:r2. BLOCKED_LEGACY has no fabricated qualification pointer or revision.                                                                                        |

ENTRY identity is `dss.api.reputation / ReputationEntry / originalEntryId`.
EVENT identity is `dss.api.reputation / @event / canonicalEventId`, derived from
the bound event, never the resource aggregate. Do not persist a caller-selected
scope string in place of these coordinates. Preserve opaque case-sensitive
ledger IDs; only actual event/fact identifiers use UUID storage.

Required uniqueness: ledger entry/event binding; original ENTRY+revision; EVENT
binding's single qualification; and each original state. Composite FKs/checks
must bind pointers to the same original scope and qualifying fact. DIRECT has
no reversed original; REVERSAL must reference the ledger's exact original and
opposite signed value. ENTRY Q is revision1 and refers to itself; W is revision2
and refers to that scope's Q. EVENT Q is revision1 and refers to itself. State
guards reject decreasing or unbacked pointers. Immutable fact/event triggers
reject update/delete; schema tests must exercise invalid combinations directly.

The event binding deliberately has **no cross-owner Outbox FK**. Core retains
Outbox ownership and its retention policy; P1 must not silently pin all existing
events or break current cleanup. The same transaction supplies native provenance;
root still compares the canonical safe envelope when admitting delivery. Current
Core evidence fields are written once by trusted application code, not protected
by an immutable-envelope database trigger. Do not advertise hostile SQL-writer
protection or assume canonical availability after retention. Missing canonical
evidence blocks admission; the sidecar is not a replacement event payload.

Indexes must support unique event/entry lookup and original ENTRY+revision.
P1 query-plan tests must show bounded reads with many unrelated records. No
global ledger, Outbox or award scan is acceptable as a per-event operation.

## Exact O1 projection

The producer exports its own versioned fact view, not an Achievements type.
Root maps it to the accepted named capability after canonical checks.

| Fact                    | revision / action               | qualification binding                                                                                                             | retiredThrough / predecessor |
| ----------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Original Q              | `1` / QUALIFY                   | qualificationId = Q fact ID; qualificationRevision `1`; qualificationEventId = original event ID; qualificationFactId = Q fact ID | `0` / null                   |
| Original W              | `2` / WITHDRAW                  | Same exact original Q identity and event                                                                                          | `1` / null                   |
| Reversal contribution E | `1` / QUALIFY in `@event` scope | Self fact/event identity                                                                                                          | `0` / null                   |

Wire revisions are canonical decimal bigint strings, not Number. Facts retain
stable IDs through retries. Root preserves the existing safe scalar payload
keys; it does not inject actorId as a new rule recipient or guess a contribution
from aggregate type. Direct contribution explicitly references Q; reversal
contribution explicitly references E. W remains mandatory lifecycle control even
when no reversal rule matches. Existing rule preflight decides supported recipient
keys and filters before automatic activation; this design does not change rules.

Read for an original event returns Q plus its current W when withdrawn. Read for
a reversal returns Q,W,E. This is at most three facts, with a single coherent
producer snapshot and exact contribution reference. A null/missing/foreign
pointer or unsupported codec becomes a bounded blocked disposition, not an
empty successful command. No arbitrary array or raw JSON crosses the owner port.

## Writer transaction and lock order

Keep the root transaction's default isolation and timeouts. Technical callbacks
stay infrastructure-only; business ports contain no Prisma client.

1. Keep the current direct actor/recipient guard or original-entry reversal guard.
2. Keep duplicate short circuits before INSERT, response projection and evidence.
3. Keep ledger INSERT → existing Users/reversal response composition → Audit →
   Outbox. Retain the created envelope/event ID instead of reallocating it.
4. Append the owned event binding, facts and current pointer before commit.
   A failed append rolls back ledger, Audit, Outbox and qualification records.
5. For reversal, reread the original under its existing guard. The compensating
   ledger FK and successful INSERT precede provenance resolution, so an original
   committed by a concurrent creator is visible before its pointer is required.
   No second transaction publishes qualification evidence after the response.

No Achievements call, queue add or consumer lock belongs in this transaction.
Native sources use their stored Q pointer. Direct creation and reversal cannot
deadlock through newly introduced opposite lock orders: source state is created
with its ledger row; only reversal mutates that original pointer. Existing
parallel duplicate, profile-failure and evidence-failure assertions stay exact.
New P1 regressions must verify this order and genuine blocking in PostgreSQL.

## Legacy-original compatibility policy proposed for approval

Before P1, no owned event pointer identifies an original ledger row's canonical
event. The characterization deliberately removes one synthetic original event
or adds a second candidate: business reversal still succeeds. This is a fixture
control, not evidence that the normal writer duplicates or deletes events.

Propose keeping that business API behavior while failing closed for gamification:

- Native original: use its exact stored Q/event identity; no legacy lookup.
- Legacy original with exactly one valid canonical candidate: under the original
  reversal guard, append a VERIFIED_LEGACY binding/Q as predecessor context,
  then the new reversal binding/W/E in the same transaction.
- Zero candidates, more than one, wrong scalar type/value/actor/recipient,
  unsupported version/category, or missing canonical evidence: commit the normal
  ledger reversal and its event, with BLOCKED_LEGACY provenance. Do not invent Q
  or silently discard mandatory control to award the new contribution.
- Infrastructure errors still abort the transaction; do not translate a failed
  database query into the absence of evidence. Blocked provenance is an explicit
  result of a successful bounded read/validation.

Core owns a new narrow canonical candidate reader, composed at root into the
Reputation technical writer. It selects by exact producer, original aggregate
type/ID and direct event name, returns at most two candidates, then validates
version/category and safe typed fields. Count ambiguity **before** choosing a
matching payload; never pick the earliest UUID/timestamp or ignore a conflicting
second candidate. A Core-owned compound index on that lookup coordinate plus ID
is part of the future implementation review; LIMIT2 bounds examined candidates.
JSON number1 must differ from string`"1"`; failed parsing is not a cast/coercion.

The producer read view is separate from this technical Core reader. Canonical
event lookup is Core-owned; producer qualification SQL remains Reputation-owned.
Root performs technical attestation and translation, not reputation eligibility.
Canonical events referenced by a later admission must remain available under the
separately reviewed retention preflight. This packet does not implement retention.

Adopting an old Q as context is not replay, backfill or a fresh historical award.
Do not modify old ledger/events/markers or change the persisted activation cutoff
based on `Outbox.createdAt`. Pre-cutoff legacy awards still require explicit
reviewed mappings in C2; the existence of a source Q does not prove each award's
binding. Repair of BLOCKED_LEGACY requires a separately reviewed append-only
resolution protocol, not editing history or automatically retrying bad evidence.

## Root admission boundary and limits

P1 may provide an inactive root adapter that obtains the producer view and
Core's safe canonical fields in one new Repeatable Read transaction, compares exact identities,
and builds the O1 command. No public resolver, scheduler or queue invokes it.
This isolation belongs only to the proposed new composed read, not existing writers.
Tests may call it explicitly. Missing required facts/canonical records return
bounded blocked codes; unknown failures preserve identity. ActorId is checked
for provenance but is not added to O1's payload contract.

This snapshot is not a distributed transaction with all later award writes.
A withdrawal committed after a read can require a subsequent control delivery;
do not claim instantaneous cross-owner revocation. O1 prevents stale awards
against withdrawals it has accepted. C2 must separately seal admissions, handle
freshness, legacy mapping and durable CONTINUE work; C3 supplies queue delivery.
P1 does not substitute its three-fact bound for O1's64-row retirement bound.

## Proof required before P1 runtime acceptance

1. Forward migrations, constraints, immutable history and zero unintended drift;
   no historical rewrites or changes to accepted O1 indexes/migrations.
2. Direct/reversal native facts, exact entry/event identities, signed values,
   duplicate/replay, concurrent original/reversal and evidence-stage rollback.
3. Legacy single/missing/ambiguous/malformed candidate outcomes, query failures
   and late commits, with unchanged successful public reversal responses.
4. Actual Reputation → canonical root adapter → O1 commands: W before Q, Q then W,
   late/repeated Q, independent configured reversal contribution, no implicit
   historical award mapping, and manual award preservation. Synthetic facts alone
   do not satisfy this producer integration proof.
5. Bounded indexed producer/Core reads with large unrelated histories; unchanged
   timeout/isolation and explicit SQL-work measurements, not a latency SLA.
6. Named exports, module isolation, singleton wiring, full local quality gate,
   CI and owner acceptance before merge. No automatic activation is implied.

The current packet supplies only the existing event/legacy characterization.
Its first focused attempt used incorrect Outbox select field names; that failed
log is retained. Correcting the test to the actual schema changes no runtime or
assertion. A separate shell-redirection failure happened before Jest started and
must not be counted as a test run. Final verification belongs to this packet's
PR and local receipt; the accepted O1 results do not certify P1.

DEBT-090, DEBT-007, D7 and the later stack audit remain open.
