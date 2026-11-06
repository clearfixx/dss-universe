# DEBT-007 — C1 qualification and admission protocol

Date: 2026-10-29. Baseline: accepted mainddb685d, including PR108.
Status: protocol/characterization candidate. No runtime or migration authorized.
The owner approved new legitimate qualification cycles, not restoration by late
old-cycle events. Existing scoring, caps, recipient precedence and API remain.

## Evidence that drives this protocol

The migrated [owner characterization](../../apps/api/test/gamification-delivery-characterization.e2e-spec.ts)
now passes5/5. Besides existing Points atomicity/replay and source-order cases,
it proves a successor can be marked IGNORED while the predecessor award is still
active; after source rollback the successor is DUPLICATE, not awarded. These are
legacy service sequences, not proof that this protocol is implemented or that a
real publisher has supplied a new-cycle contract. The new fixture first collided
with a previous rule's event name; unique synthetic names fix isolation without
weakening exact assertions. The failed and corrected logs are retained separately.

Consequently, remembering only a withdrawn qualification is insufficient: a new
cycle must reconcile its predecessor withdrawal before non-repeatable eligibility.
A queue lease or execution order does not establish this business order.

Read-only primary-dev metadata inspection found6 Points rules and0 Achievement
rules. Active Points inputs are comment.created, news.published, reputation.changed
with signed filters, and dormant Community/Knowledge names from migrations.
No profiles/content or numerical scoring values were read or changed. The query
used a guarded local5433 connection and a READ ONLY transaction; its first field
name was corrected against schema. Metadata SHA256:
2c9b75d28d0702cc29b2ffe0f0484cc99bb6955c3a5ddc27857d9d337afcb927.
This is local configuration evidence, not a production inventory.

## Producer authority and qualification coordinates

Use an opaque producer-owned qualification ID bound to the canonical qualifying
event. In the simple one-qualification case it may be that event's UUID. It must
not be minted by the consumer or changed by retry. Scope includes producer,
source kind and source ID; equal IDs in different producers are not equal scopes.

The producer owns a separate monotonically increasing lifecycle revision under
its aggregate transaction/lock. Wire revisions are positive decimal strings,
not JavaScript floating-point integers. Do not substitute createdAt, occurredAt,
UUID sort order, queue order or an editor's revisionVersion. Current News workflow
has an editorial decision ID and revisionVersion, but neither proves a complete
withdrawal/reinstatement sequence. ARCHIVED exists as a status; the inspected
NewsEditorialAction enum has no withdrawal action. Do not invent that feature.

Proposed immutable fact V1:

| Field                        | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| producer/sourceKind/sourceId | Source-owner namespace, not a caller-selected foreign table               |
| factId/canonicalEventId      | Stable producer fact identity and atomically written Outbox event         |
| lifecycleRevision            | Explicit source-owner order, positive decimal bigint                      |
| action                       | QUALIFY or WITHDRAW                                                       |
| qualificationId              | New qualification for QUALIFY; exact withdrawn qualification for WITHDRAW |
| retiredThroughRevision       | Explicit retirement coverage preceding a new qualification                |
| predecessorWithdrawalFactId  | Producer proof of that retirement, absent for the first cycle             |
| contractVersion              | Qualification fact codec, independent of existing event name/version      |

A new QUALIFY after withdrawal must carry verified retirement coverage, not just
a greater number. The source owner commits its current pointer/counter, immutable
fact and original Outbox envelope in one transaction. Root obtains a narrow
fact view from that owner; it must not query a foreign feature's tables through
an Achievements repository or reconstruct order from source payload timestamps.

Keep current event names/versions and rule keys compatible. Prefer a separately
versioned owner fact view/sidecar linked to the event over silently changing
`.v1` to `.v2`, which would stop current rules matching. Any producer persistence
extension requires its own approved implementation; this document creates none.

An event may have lifecycle control facts and a distinct immutable contribution
eligible for configured rules. For example, a deletion can withdraw an earlier
contribution while an existing rule rewards a deletion decision. Do not silently
drop that configured rule by treating every control event as rollback-only.
Descriptors must preserve current valid rule inputs; legacy rollback's existing
early-return semantics remain explicitly distinct from the new qualified command.

## Achievements-owned transition algorithm

Proposed private records, not migration DDL:

| Record                    | Key and invariant                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| SourceLifecycleCursor     | One row per producer/source scope, highest applied revision, current qualification/action and retirement coverage         |
| SourceLifecycleFact       | Immutable source revision/fact binding; conflicting reuse is rejected, including same revision with another qualification |
| AwardQualificationBinding | Award ID→qualified scope/qualification/revision; new bindings commit with awards; legacy bindings need reviewed evidence  |

The source state and bindings belong to Achievements. A producer journal belongs
to its source owner. Root owns only technical delivery storage. No root-owned
achievement eligibility table or feature-to-feature service import is introduced.

Recommended algorithm:

1. Validate producer-attested immutable facts and exact scope bindings. Acquire
   all involved source locks in a deterministic scope order. A mismatched fact
   never becomes an ignored success merely because its revision is old.
2. On higher revision, reconcile the explicitly retired prefix and record the
   new state atomically with revocations/Audit/Outbox. Do not publish a cursor
   advance while predecessor awards remain active. A legitimate newer QUALIFY
   reconciles old awards before its non-repeatable eligibility is evaluated.
3. Equal revision with the same fact is a replay. Lower revisions cannot change
   current state or create an award, but owned event/rule dedup remains intact.
4. Process current event rules with existing per-rule transactions/markers. Each
   transaction reacquires source guards and rereads current state before award.
   A later withdrawal between two rules revokes already committed awards and
   prevents remaining old-cycle rules from creating another award on replay.
5. Preserve current recipient existence semantics, rule ordering, caps, cooldown
   and immutable history. A new cycle grants eligibility under those rules; it
   does not force an award or reset unrelated active achievements.

Source guard precedes the existing user/achievement guard. Lock all affected
user/achievement coordinates in deterministic order for retirement. Legacy
binding/mapping commands must participate in the same source guard. Recheck
eligibility after locks; a decision computed before the guard is not sufficient.
Manual awards remain governed by their existing owner contract and are not
silently attached to a source or revoked by a guessed mapping.

Control reconciliation may commit before later award-rule transactions, just as
partial owner success already exists. Technical completion waits for the whole
command. Every individual state/revocation/marker/evidence unit stays atomic;
this is not a cross-rule or cross-owner all-or-nothing promise.

| Producer fact order | Example delivery order          | Required result                                                                      |
| ------------------- | ------------------------------- | ------------------------------------------------------------------------------------ |
| Q1:r1, W1:r2        | W1 then Q1                      | Old award cannot reappear                                                            |
| Q1:r1, W1:r2, Q2:r3 | Q1 then Q2 then W1              | Q2 reconciles its retired predecessor before eligibility; late W1 does not revoke Q2 |
| Same                | Q2 then Q1 then W1              | Q2 may qualify; stale Q1 cannot create an award                                      |
| Q2:r3, W2:r4        | W2 then Q2                      | Q2 remains withdrawn                                                                 |
| Q3:r5 after W2      | Arbitrary older replays then Q3 | A legitimate new cycle may qualify under unchanged rules                             |

Performance is a required proof, not an assumed transaction size. Profile indexed
retirement against the actual grant population before runtime acceptance. If
bounded continuation is necessary, a durable RETIRING barrier must block awards
until prefix retirement is complete; do not truncate rows, advance the cursor
early or merely increase a transaction timeout. That continuation protocol needs
review before implementation rather than being invented as a recovery shortcut.

## Legacy boundary

Unversioned sourceType/sourceId rollback is not enough to distinguish old replay
from legitimate new qualification. Automatic C must not call the legacy command
as a fallback or assign an invented lifecycle revision. Preserve existing direct
legacy API behavior unless a separate compatibility change is approved; keep it
out of the new automatic path through explicit qualified capabilities/tests.

An original event with an immutable contribution can use a producer-declared
event-identity qualification. Mutable source withdrawal/reinstatement requires
the lifecycle fact contract. For existing source-bound awards, resolve legacy
bindings through canonical event IDs or an explicitly reviewed mapping manifest.
Ambiguous/missing bindings produce BLOCKED_LEGACY_MAPPING with no economic write.
Mapping must not rewrite awards or replay historical source events. A new valid
withdrawal may reference a pre-cutoff existing award; excluding old delivery is
not permission to ignore a new reversal. Prove this compatibility before closure.

DEBT-090 closure must prove the real qualified owner/admission path and agreed
legacy handling, not only a new synthetic command in isolation. The legacy
characterization remains historical evidence and must not be mistaken for the
new desired regression contract.

## Technical admission and consumption storage

| Logical record     | Fields/constraints proposed for C2                                                                                                                                   |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admission          | Unique destination+eventId and opaque admissionId; immutable codec/contract version, safe per-owner facts, qualification facts, safe-fact digest and cutoff identity |
| ConsumptionReceipt | Admission FK, READY/RUNNING/RETRY_DUE/COMPLETE/BLOCKED, current token/lease, attempts/retry epoch, due time and three explicit owner-completion flags                |
| ConsumptionAttempt | Immutable attempt/token/epoch coordinates and bounded failure/disposition codes; no unrestricted payload or driver message                                           |

Cutoff identity is destination plus the persisted cutoff, not mutable activation
revision: pause/resume must not invalidate prior admissions. Each immutable
projection version must remain decodable. A changed producer contract does not
permit editing a sealed admission or loading unrestricted canonical JSON as a
fallback. Fail closed and require a separately reviewed projection upgrade path.

Preparation validates B's current claim, eligible canonical source and registered
owner fact views in one root infrastructure transaction. Reuse existing owner
fragments/unit-of-work boundaries; expose no Prisma transaction in business ports.
Insert admission/receipt before queue IO. Existing immutable admission is reused
on publication retry; different facts for the same identity are a conflict.
Queue body V1 is only destination+admissionId+formatVersion. Event/cycle fields
from a queue caller cannot create admission or reset a failure budget.

The publisher uses a destination-local stable job ID for one B publication cycle.
Consumer admission remains valid before enqueue acknowledgement, after QUEUED,
or after uncertain publication recovery. The queue is a wake-up hint; the database
receipt decides whether any owner command may run. Duplicate/stale hints cannot
turn COMPLETE/BLOCKED into READY. This does not authorize queue.add yet.

Consumption claims lock activation and the due receipt briefly, increment the
persisted attempt count and allocate a unique token. No owner IO occurs while
holding the root claim transaction. Proposed initial budget5/lease60s and
backoff1/2/4/8s mirror operational values but require new C runtime approval;
accepted B numbers are not automatic authorization for consumption semantics.

After an owner returns, mark its technical completion only by current-token CAS.
If CAS loses, stop further owner calls. Previously durable owner-completion flags
survive retry. If an owner commit precedes a lost technical receipt, replay may
occur; owned markers protect prior effects. Rules for unresolved owner work remain
live: newly enabled/unmarked rules can affect a retry. No frozen economic snapshot
or exactly-once outcome is promised for that ambiguous window. Completed logical
deliveries are never automatically replayed after a rule change.

Only after required commands finish may the current token mark COMPLETE. Root
progress is technical delivery, not an award count; current void capabilities
cannot be treated as effect receipts. New narrow outcome/qualified capabilities
must be owner-local and explicitly approved. Levels still consumes the durable
Points second hop, not a direct balance passed from the first coordinator call.

Lease recovery fences root callbacks, not an already running owner transaction.
Validate distinct-event balance-read/sync interleavings in Levels and concurrent
Points award/source-reversal, not only duplicate-event tests. Those remain proof
requirements, not newly certified defects or guarantees in this design packet.

## Pause, lost hints and publication extensions

Soft pause prevents new publication and consumption claims; admitted commands
may finish. An unclaimed job observed during pause consumes no owner attempt and
must not mark its database receipt COMPLETE. Recovery bookkeeping may run while
paused, but no replacement owner claim is admitted.

A completed/failed retained BullMQ job cannot be assumed to execute on add again.
For a due nonterminal receipt whose hint is lost/parked, propose an atomic audited
publication-cycle rollover under activation→delivery→receipt lock order. Reset
publication attempts for the new hint, not consumption attempts or owner markers.
Never roll a RUNNING/COMPLETE receipt. Reconciliation uses bounded batches and
broker observation; unknown broker state is not evidence that an old hint is gone.
Races may create duplicate hints, which the receipt must tolerate. No busy loop
or unbounded cycle generation is acceptable while a live hint is still waiting.

This extends B's cycle/control contract and needs explicit implementation review;
do not mutate B states through ad hoc caller SQL. Also distinguish projection/
source rejection from QUEUE_ADD_FAILED. D owns audited manual retry epochs,
retention and queue/DLQ operations. Original immutable admission, source identity,
cutoff and historical failures survive every technical retry.

## Catalog/configuration gate

A named-factory AST scan found21 createEventEnvelope call sites in17 authored API
files; dynamic family expressions were retained rather than expanded by guessing.
This is not certification of every possible emitter or dynamic value. Inventory:

| Owner/family      | Observed names/families                                                                                         |
| ----------------- | --------------------------------------------------------------------------------------------------------------- |
| Root News draft   | news.article.created.v1, draft-saved.v1                                                                         |
| Root profile wall | users.profile-wall.post-created.v1, post-retracted.v1                                                           |
| News workflow     | news.article.${action}.v1 and notifications.news.editorial-status.v1                                            |
| News metadata     | news.link._, news.pin._, news.settings.updated.v1, news.${taxonomyAction}.v1                                    |
| Interactions      | comments.comment._, notifications.mention._, bookmarks.bookmark._, reactions.reaction._, interactions.target.\* |
| Moderation        | content-reports.report.created/reviewed.v1, moderation.annotation.created/revoked.v1                            |
| Reputation        | reputation.direct.changed/reversed.v1                                                                           |
| Points            | community-points.awarded/reversed.v1                                                                            |
| Achievements      | achievements.${action}.v1                                                                                       |
| Levels            | levels.changed.v1                                                                                               |
| Custom Titles     | custom-titles.${action}.v1                                                                                      |

Descriptors must enumerate supported versions, eligible recipient keys, safe
scalar facts, lifecycle facets and emitted event dependencies. Do not forward
title, body, reason text, credentials or unrestricted metadata just because a
canonical event contains them. Structurally unsupported registered events may
be classified explicitly; potentially applicable events are not discarded merely
because no rule currently matches. Unknown live producers/legacy rollback hints
need explicit blocked/review dispositions rather than a generic payload fallback.

Serialize relevant rule/catalog changes under a root-composed configuration
revision guard inside owner mutation transactions. Guard metadata/required-field
compatibility, not numerical scoring policy. Existing guards remain owner-local;
root composes technical revision/validation through narrow ports. Valid numerical
changes remain live for unmarked work. Incompatible new fact requirements cannot
silently reinterpret old unresolved admissions; report the backlog and require a
reviewed version-upgrade procedure before permitting that mutation.

Preflight reports real rules and producer availability. Declared dormant Forum/
Knowledge defaults remain configured without pretending their producer exists;
installation must supply its reviewed descriptor before admitting actual events.
Cycles require a valid owner-backed termination proof or fail closed with an
explicit report; do not add a hop cap or quietly disable a working rule. Expanding
dynamic families and reviewing every relevant projection are activation gates,
not authority to claim an arbitrary-rule framework is already complete.

## Implementation and acceptance gates

1. Agree on this qualification/admission protocol and remaining physical work
   budgets; this packet changes no production schema or consumer.
2. Separately approve owner-local DEBT-090 storage/qualified commands and producer
   fact implementation. Preserve old API contracts and prove the compatibility
   boundary, all ordering permutations, partial-rule success and stale attempts.
3. Approve C2 root persistence/projection and named publication extensions, then
   prove actual DB constraints/CAS/config races, private-data exclusion and query
   work. No owner effects during admission preparation.
4. Approve C3 real queue/runtime integration and full two-hop effect tests,
   including ambiguous enqueue, lost hint, pause/resume and crash recovery.
5. Complete D operations/activation runbook and owner acceptance before enabling
   automatic awards. Historical replay/backfill and Phase11 remain separate.

Focused5/5 establishes legacy behavior only. Full local quality and CI are
pending for this protocol packet. C1 design acceptance is not runtime C approval,
DEBT-090 correction, D7 acceptance, stack audit or Phase11 readiness.
