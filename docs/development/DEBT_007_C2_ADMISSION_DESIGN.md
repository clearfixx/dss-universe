# DEBT-007 — C2 admission and durable continuation

Baseline: accepted main `601fa4f` (P1 / PR149).
Status: proposed staged design, not accepted or runtime-authorized. No migration,
queue, consumer activation or frontend change is supplied by this draft.

## Source-backed integration gaps

| Existing boundary     | Inspected evidence                                                                                  | C2 consequence                                                                                                                            |
| --------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| B publication claim   | `PublicationClaim` contains eventId, token, cycle and cycleAttempt; acknowledgement fences all four | Admission must validate the same claim while holding the delivery row, not accept an eventId alone                                        |
| B activation lock     | `lockActivation` takes FOR SHARE before delivery work; soft pause prevents new claims               | Preserve activation→delivery→receipt order; do not hold those locks during owner calls                                                    |
| P1 preparation        | `ReputationQualificationAdapter.prepare` opens its own Repeatable Read transaction                  | Extract a transaction-bound root preparation operation for admission; preserve the existing wrapper and do not nest independent snapshots |
| P1 provenance         | At most Q/W/E; exact canonical matching; missing legacy proof blocks                                | Seal only verified, versioned safe data; no canonical-JSON or legacy-consume fallback                                                     |
| O1 outcome            | COMPLETE, CONTINUE or BLOCKED; progress has scope, generation and sequence                          | CONTINUE is committed progress, not an owner failure; persist a wake-up without exhausting the technical failure budget                   |
| B publication failure | Only QUEUE_ADD_FAILED and CLAIM_EXPIRED exist                                                       | Projection/configuration rejection needs a separate reviewed disposition, never a fabricated queue failure                                |

Source paths are under `apps/api/src/composition/gamification-delivery/`,
`composition/reputation/infrastructure/reputation-qualification.adapter.ts` and
`modules/achievements/domain/types/qualified-achievement.type.ts`.
The accepted [C1 protocol](DEBT_007_CONSUMER_PROTOCOL.md) remains authoritative.

## Admission invariant

One immutable admission per destination/event ID binds codec version, persisted
cutoff identity, registered descriptor identity and exact safe owner projections.
Pause/resume revision is not the cutoff identity. Admission creation and its first
receipt commit before queue IO, in the transaction that validates the current
publication claim. Existing admissions are reused only after exact identity
checks; a conflicting projection is blocked rather than overwritten.

Queue payloads carry destination, admission ID and format version only. They
cannot create an admission, choose economic facts or reset a receipt. Canonical
source and producer-context retention must be settled before activation; P1's
absence of an Outbox FK does not establish retention of predecessor evidence.

## Receipt and progress invariant

Claims allocate a unique token and fence completion/failure by receipt, state,
epoch and token. Owner IO is outside root claim transactions. Durable completion
flags survive technical retry. A lost CAS stops further owner calls; it cannot
undo an already committed owner effect. Replays use owner markers and preserve
the accepted at-least-once semantics.

Persist owner CONTINUE coordinates and a due wake-up atomically. Progress and
technical failure counters must remain distinct: arbitrarily many valid bounded
retirement pages cannot become failure merely because there are more than five.
Terminal COMPLETE/BLOCKED receipts cannot be reopened by duplicate queue hints.
Levels continues to consume the durable Points second hop, not an in-memory
balance supplied by this coordinator.

## Proposed physical records

These are proposed root-owned infrastructure records, not Prisma models or an
authorization to migrate. UUIDs identify admissions/attempts; counters use BigInt
with nonnegative constraints and decimal-string transport, never JS-number
round trips. All timestamps follow B's millisecond UTC convention.

| Record             | Identity and immutable fields                                                                                                                                         | Mutable fields and guards                                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Admission          | UUID primary key; unique destination/eventId; composite restrictive FK to B delivery; cutoff; descriptor ID/version; codec version; safe sealed projection and digest | None. Reject updates to identity/projection; no cascade deletion                                                                                                                                    |
| ConsumptionReceipt | admissionId primary/restrictive FK; destination duplicated only with a composite consistency FK                                                                       | READY/RUNNING/RETRY_DUE/COMPLETE/BLOCKED; epoch; claim sequence; token/claimedAt/leaseUntil; availableAt; epoch technical failures; Points/Levels/Achievements completion flags; bounded block code |
| ConsumptionAttempt | UUID; unique claim token; unique admissionId/epoch/claim sequence; admission and epoch identity; startedAt                                                            | One terminal transition from OPEN to COMPLETE/CONTINUED/FAILED/EXPIRED/BLOCKED/FENCED; finishedAt and bounded disposition. Settled evidence cannot be rewritten                                     |
| OwnerProgress      | receipt/owner primary key; owner discriminant                                                                                                                         | Versioned owner-local coordinates; for O1: scope, generation, sequence. Updated only with the receipt's current-token CAS in the same transaction                                                   |

Receipt CHECK constraints bind RUNNING to a non-null token and lease; all other
states clear those claim fields. Terminal receipts have no due wake-up. A COMPLETE
receipt requires all applicable owner steps complete; a non-applicable step is
explicitly complete at admission using the registered descriptor, not inferred
from a later rule lookup. Block reasons and codec versions are reviewed closed
sets. No raw exception, payload content, SQL or credential is stored in attempts.

Due index: destination/state/availableAt/admissionId. Recovery index:
destination/state/leaseUntil/admissionId. Attempt history index:
admissionId/epoch/claim sequence. Progress is bounded by the finite owner set;
unbounded page history belongs in attempts, not one ever-growing JSON array.
Admission projection size and every variable-length field still need explicit
codec limits before implementation; hashing alone does not bound storage.

## Proposed state transitions

| Trigger              | Preconditions                                                                         | Atomic durable result                                                                                                           |
| -------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Prepare              | Exact current B publication claim, compatible descriptor and verified source evidence | Insert immutable admission and READY receipt together, or reuse exact existing identity                                         |
| Claim                | ACTIVE destination, READY/RETRY_DUE receipt due now                                   | RUNNING, new token/lease and incremented claim sequence; append OPEN attempt                                                    |
| Owner completes      | RUNNING, current epoch/token; owner call already returned                             | Mark that owner complete; retain other completion/progress. Last applicable owner settles COMPLETE and attempt COMPLETE         |
| Owner continues      | Same current claim; valid owner progress outcome                                      | Save progress, settle attempt CONTINUED, clear claim and return READY with due wake-up; preserve failure counter and done flags |
| Technical failure    | Same current claim                                                                    | Settle FAILED attempt; increment epoch failure counter, RETRY_DUE/backoff or BLOCKED at approved budget                         |
| Owner policy rejects | Same current claim; reviewed bounded owner outcome                                    | BLOCKED receipt and attempt, without pretending queue publication failed                                                        |
| Lease recovery       | RUNNING lease expired, still same token under row lock                                | Settle EXPIRED attempt and apply technical-failure policy; clear token                                                          |
| Stale callback       | Epoch/token/state mismatch                                                            | No receipt/progress/done-flag mutation and no subsequent owner call                                                             |
| Duplicate hint       | COMPLETE/BLOCKED or a currently owned receipt                                         | No reopening, epoch reset, extra failure charge or owner call                                                                   |

The existing B budget of five attempts and 60-second publication lease are facts
about publication only. Proposed consumption budget/lease/backoff require explicit
C approval. Claim sequence counts work; it is not the failure budget. A valid
CONTINUE never increments or resets technical failures: otherwise progress could
either exhaust a five-attempt budget or conceal repeated technical failures.
Propose a five-technical-failures budget per epoch, a 60-second lease and
1/2/4/8-second retry backoff. Successful owner completion and CONTINUE do not reset
this counter. This makes the budget finite without charging valid progress;
owner acceptance is still required before consumption runtime implements these
parameters. Manual retry creates a new audited epoch through D, resets only that
epoch's technical counter, and never edits old attempts or erases completion
flags. Claim sequence remains monotonic across epochs.

A due receipt is the durable scheduling authority. A CONTINUE cannot rely on
BullMQ re-adding the same live job ID: deduplication could consume its only hint.
C3 must implement a bounded due-receipt pump plus reviewed publication-cycle
rollover, or an equivalently durable wake-up protocol. Until this is proved,
CONTINUE scheduling is not implementation-ready. Ordinary owner completion after
a committed effect but before receipt CAS remains replayable at least once.

## Transaction and lock boundaries

Admission uses a new operation-local Repeatable Read transaction, not a global
isolation change. Proposed order: activation FOR SHARE, configuration compatibility
guard, exact delivery FOR UPDATE, existing receipt if present, then canonical and
producer reads via transaction-bound root adapters. Every competing operation
touching more than one of these objects must use the same order; configuration
writers cannot acquire the guard after a delivery lock. The compatibility guard
is a proposed addition, not something supplied by B or P1 today.

The publication claim must match eventId/token/cycle/cycleAttempt after locks are
acquired. An expired timestamp alone does not invalidate B ownership; recovery's
token/state transition does. Pause blocks new claims but may allow the already
claimed publication to finish preparation. Cutoff and descriptor identity must
still match. Admission commits before queue IO; queue acknowledgement remains a
separate token-CAS operation.

Extract P1 preparation into a transaction-bound infrastructure operation and keep
its existing standalone Repeatable Read wrapper for compatibility. A new snapshot
inside that wrapper is not the admission snapshot. Serialization failures abort
the whole admission; the runner records a technical disposition only after the
failed transaction ends. No partially sealed projection survives.

Receipt claim, completion, continuation and recovery are short transactions with
activation before delivery when needed, then receipt and progress. Calls into
Points/Levels/Achievements execute outside those locks. The receipt token fences
root bookkeeping, not an owner transaction already executing. Distinct-event
owner races therefore require owner-level proofs and cannot be solved merely by
extending the receipt lease.

Projection rejection occurs before an admission exists, so it also needs durable
publication disposition evidence separate from ConsumptionAttempt. The final B
extension must distinguish admission rejection from QUEUE_ADD_FAILED and
CLAIM_EXPIRED; adding a fake queue failure would misreport both operations and
retry policy. The following proposed rejection contract supplies that separate
history and settlement; implementation and concurrency proof remain pending.

## Proposed admission rejection contract

Add a separate append-only AdmissionRejection record keyed by publication claim
token, with destination/eventId/cycle/cycleAttempt, descriptor version if known,
bounded code and observedAt. Its restrictive FK targets the delivery. The B-owned
root infrastructure operation `rejectAdmission(claim, rejection)` locks activation
then delivery and compares all current claim coordinates. In one transaction it
appends rejection evidence, changes CLAIMED to BLOCKED and clears claim fields.
It does not insert a publication-failure row or increment consumption failures.
Duplicate settlement returns false; stale projection work cannot block a newer
publication cycle. Repository methods remain root infrastructure capabilities,
never sibling module calls or Prisma-bearing business ports.

Proposed rejection codes distinguish unsupported descriptor/version,
incompatible configuration, missing canonical evidence, canonical conflict,
blocked legacy mapping and invalid qualified projection. An unavailable database
or thrown unknown error is not missing evidence: abort preparation, retain the
publication claim, and let its accepted lease recovery handle abandonment.
This initially avoids inventing an unapproved transient-publication error budget;
D may later supply an explicit operator disposition with the original history.

No enum/schema edit is supplied here. Existing QUEUE_ADD_FAILED and CLAIM_EXPIRED
history keeps its meaning. A blocked-before-admission delivery needs audited D
retry after source/catalog repair; it cannot acquire a fabricated sealed command
merely because a queue hint exists.

## Deterministic characterization matrix to implement

| Boundary             | Required controlled schedule and assertion                                                                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Snapshot             | Hold admission after its first read; commit canonical/producer mutation concurrently; every read uses the same transaction client and snapshot, or admission aborts atomically |
| Claim race           | Recover claim A, allocate claim B, then release A's preparation; A creates no admission, rejection or receipt and cannot settle B                                              |
| Atomic seal          | Fail receipt insertion after admission insertion; neither survives rollback; replay creates exactly one pair                                                                   |
| Reuse/conflict       | Duplicate exact preparation reuses identity; changed codec/cutoff/projection cannot overwrite a seal                                                                           |
| Progress             | More than five valid 64-row O1 pages reach COMPLETE without technical-budget exhaustion; progress plus wake-up commits together                                                |
| Partial owner commit | Commit one owner effect, interrupt before receipt flag; replay uses the same logical identity, does not duplicate effects and does not skip remaining owners                   |
| Recovery             | Expire token A, claim B, release A success/failure/CONTINUE callbacks; no A callback mutates B or starts a subsequent owner step                                               |
| Pause                | Pause between claim and execution; accepted claim may finish, unclaimed hint consumes no attempt; due receipts resume without loss                                             |
| Configuration        | Hold compatibility guard while mutating rule requirements; incompatible mutation and admission cannot both commit against conflicting projections                              |
| Wake-up              | CONTINUE while old BullMQ job is still active; terminal/retained/missing/unknown broker observations; no lost due work or unbounded rollover                                   |
| Owner concurrency    | Distinct-event Points award/reversal and Levels balance-read/sync schedules; root receipt CAS alone is not accepted as proof                                                   |
| B rejection          | Source rejection history is separate from queue failures; stale rejection cannot block a replacement claim                                                                     |

Use explicit database barriers and observed lock/state transitions, not sleep or
retry-until-green. Measure actual SQL work on many unrelated admissions and long
qualification histories; EXPLAIN must use the actual query factory. State-model
tests supplement these proofs but cannot certify the database/queue behavior.
These are required future tests, not reported passing results.

## Proposed owner outcome boundaries

The new capabilities are separate named exports; existing `consume(): void`
facades retain their API/compatibility behavior. Root maps owner outcomes into
receipt transitions and never imports owner services or ledger repositories.

| Owner        | Source evidence                                                                                                               | Proposed narrow result and interpretation                                                                                                                                                                  |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Points       | Ordinary consumption returns AWARDED/DUPLICATE/IGNORED/CAPPED; source reversal returns AWARDED even when `entries[0]` is null | COMPLETE with a bounded disposition: APPLIED, ALREADY_PROCESSED, NO_MATCH, CAPPED or NO_SOURCE_EFFECT. Do not derive affected counts from the first entry, and do not equate AWARDED with a positive award |
| Levels       | Unsupported events return duplicate=false/transitions=[]; supported events use their own processed marker                     | COMPLETE with SYNCED, ALREADY_PROCESSED or NOT_APPLICABLE. Applicability comes from the owner descriptor, never from an empty transitions array                                                            |
| Achievements | Qualified capability already returns COMPLETE/CONTINUE/BLOCKED                                                                | Preserve the owned result, validated progress version and bounded code. Do not collapse CONTINUE to successful completion                                                                                  |

These dispositions describe processing, not amounts or rule snapshots. The
Points implementation must report the reversal outcome where all source entries
are still available inside the owner, rather than infer it from the current
lossy `CommunityPointConsumption` projection. Levels likewise reports supported
event handling before losing that distinction in an empty result. Unknown errors
propagate to the technical failure path; they never become NO_MATCH.

For Points, qualification control and a separately rewardable contribution need
separate durable completion coordinates. Existing early-return source reversal
does not provide that contract. Propose an owner-local qualified capability with
control/contribution outcomes and owner idempotency for each facet; root supplies
attested references, not reversal SQL or rule selection. Preserve existing legacy
facade semantics. This prerequisite must be designed and separately approved
before automatic C processes such descriptors; marking the Points step complete
after only its current reversal would silently lose the contribution facet.

Levels is applicable only to its two durable Points event families today. The
first-hop receipt therefore does not synchronously recalculate Levels using a
returned Points entry. The second-hop admission carries its own event identity
and descriptor. Its owner serializes authoritative read and sync semantics;
current per-user lock starts inside `sync`, after the service's balance read, so
the required distinct-event test must explicitly cover that interval. This is
an unresolved proof requirement, not a reproduced incident or permission to
change public Levels behavior in this documentation package.

## Configuration compatibility and retention

Each descriptor version declares its supported event versions, owner steps,
control/contribution facets, scalar field types/limits and required provenance.
Its sealed compatibility signature excludes numeric award values and mutable
activation revision. Rules may change values for unmarked work under accepted
C1 semantics; completed receipt flags remain completed. A rule that needs a new
recipient key or provenance field is a structural change, not a numeric update.

Propose one destination compatibility-guard row. Admission takes its shared lock
before delivery locks; a relevant configuration writer takes its exclusive lock
inside the same transaction as its owner mutation, then validates the proposed
structural requirements through root-composed narrow capabilities. This requires
an inventory of every writer, including seeds/imports/admin mutations. A guard
used only by HTTP controllers is insufficient. Owner modules retain validation
and mutation ownership; root owns cross-owner compatibility only.

Do not scan all unresolved projections while holding a configuration lock.
Maintain root-owned per-descriptor/version nonterminal counters in admission and
terminal-settlement transactions, with nonnegative constraints and rebuildable
verification. Structural mutation is refused while incompatible unresolved
versions exist. An audited migration can install a new decoder/descriptor and
prove backlog compatibility; it cannot rewrite old admission facts. These
counters and the guard are additional proposed records, not existing B tables.

Preflight must inventory actual configured rules against actual producer
descriptors. Missing News/Comments projection or dormant Forum/Wiki producer is
reported explicitly; supporting P1 alone does not satisfy the event inventory.
Unknown emitted dependencies and unproved cycles block activation. A numerical
policy change cannot be used to hide a structural incompatibility or disable a
working rule silently.

Retention must pin the canonical evidence and reviewed mapping manifests needed
by every nonterminal admission and its owner effects, including original events
created before activation. B's delivery FK pins the delivery event only. P1 has
no Outbox lifetime FK; neither fact proves predecessor retention. Before runtime
activation, define Core-owned retention checks composed with the owners' bounded
evidence references and test attempted deletion under pending/continued work.
Completed receipt retention and manual retry history belong to D; deleting an
admission is not a mechanism for replay or changing the activation cutoff.

## Staged implementation proposal and outstanding gates

Inspected owner contracts currently expose `Promise<void>` for both Points and
Levels. Their private services already return `CommunityPointConsumption` and
`LevelSyncResult`, respectively; publishing a reviewed narrow outcome is distinct
from exporting those services. Points also returns early for Reputation reversal
before matching ordinary rules. C2 cannot claim independent control/contribution
support there merely because O1/P1 now support it for Achievements. Levels reads
authoritative balance/definitions before its repository sync; distinct-event
interleavings still need the accepted C1 concurrency proof. These are source
integration gaps, not newly reproduced production incidents or authority to
change owner behavior in this design packet.

| Stage                                       | Concrete boundary                                                                                                                                                                                    | Acceptance evidence                                                                                                                    |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| C2.1 inactive persistence                   | Admission, receipt, attempt, progress and admission-rejection records; constraints, repository CAS, due/recovery reads; transaction-bound P1 preparation; no App import, runner, queue or activation | Migrated DB atomicity, immutable identity, stale claim/callback rejection, exact safe projection, real query plans                     |
| C2.2 owner prerequisites                    | Named Points outcomes and qualified control/contribution semantics; Levels supported-event outcomes and distinct-event synchronization proof                                                         | Owner-local rule/cap/reversal/idempotency regressions; current public facade compatibility; no root-owned economic logic               |
| C2.3 compatibility and complete projections | Compatibility guard/counters, every relevant writer, full descriptor inventory, canonical and mapping retention, bounded codec limits                                                                | Configuration/admission races, backlog counter rollback, private-data exclusion, attempted evidence deletion, actual producer coverage |
| C3 queue integration                        | Durable due-receipt wake-up, reviewed B cycle rollover, runner and durable second-hop consumption                                                                                                    | Real DB/Redis pause, crash, duplicate/lost/unknown hint and long CONTINUE scenarios without retries-to-green                           |
| D operations and activation                 | Audited retry epochs, retention, preflight, operations/runbook and explicit activation acceptance                                                                                                    | Complete source/descriptor/effect matrix and owner-approved activation; no historical replay                                           |

C2.1 is an implementation outline, not yet a ready runtime request: exact SQL
columns/constraints, sealed-codec field limits and repository signatures must be
reviewable before asking for its separate authorization. Seven proposed record
families exist across C2.1/C2.3 (five persistence records plus guard and counters);
do not describe this as an already-approved four-table migration.

Splitting these stages does not waive any C1 requirement. Inactive persistence
can be accepted independently, but C2 as a whole and automatic processing cannot
be declared complete while owner facets, configuration writers, source families,
retention or wake-up semantics remain unproved. A Reputation-only route is not a
substitute for the agreed producer coverage.

This proposal documents the state machine and staged dependencies, not a release
certificate. It has not passed a package full gate or final-head CI.
DEBT-007/090, final D7, stack audit and Phase11 brainstorm remain open.
