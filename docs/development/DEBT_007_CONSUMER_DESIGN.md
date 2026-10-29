# DEBT-007 — C consumer design and ordering characterization

Date: 2026-10-29. Baseline: accepted maincc39080.
Status: design/characterization candidate; no runtime implementation approval.
Accepted A/A.1 and B remain intact. C/D, automatic awards and Phase11 are open.

## Current evidence, not inferred guarantees

| Boundary           | Inspected behavior                                                                                                                           | Consequence for C                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| B publication      | WAITING→CLAIMED→QUEUED, token/cycle fencing, bounded publication failures                                                                    | QUEUED confirms enqueue acknowledgement, not owner effects                               |
| Queue transport    | packages/jobs has no gamification queue; generic processor checks marker, calls handler, then marks separately                               | Do not reuse Activity identity, DLQ or an outer marker as atomicity                      |
| Owner capabilities | Three named consume commands return Promise<void>                                                                                            | Returned success includes owned no-ops; it is not an award count                         |
| Points             | Special reputation reversal; optional integer value; recipient userId→authorId→recipientId; first non-IGNORED rule result                    | Never substitute actorId or normalize all events into one recipient                      |
| Achievements       | Object/name validation, then rollback coordinates before rule lookup; configured recipientPayloadKey; separate per-rule transactions/markers | Preserve rollback dispatch and partial success; a static event-name list is insufficient |
| Levels             | Only awarded/reversed Points events; fresh existence/balance/definitions, then per-user transactional sync                                   | Prove a durable second hop; do not calculate levels from queue-provided balance          |
| Source ordering    | Points has revoked-source storage; Achievements rollback revokes existing awards without remembering an absent source                        | Do not infer equivalent late-original protection; see DEBT-090                           |

Inspected source checkpoints (SHA256, not test proof):

- Points service:6de4c94f08449c0d47d15f2f4566e9f2f192d89298e04c9b464f7e19a7af6279.
- Achievements service:9ac49c413fe9ca0b027a1931b53afc33433be42d3bbf80c73434278310006245.
- Levels service:d0a7c844f18cafbc0115d1ca2179f2726cff73f225cb4a5ce06a7667e1f6ade7.

The focused [migrated characterization](../../apps/api/test/gamification-delivery-characterization.e2e-spec.ts)
passes4/4: original Points atomic rollback/replay plus two source-order cases.
It uses actual AppModule/owner services and an owned disposable schema; fixture
creation is not registration/authorization proof. No BullMQ delivery is claimed.
The new Achievements case uses a configured beneficiaryId field and a synthetic
rollback event with no matching award rule; it proves the actual rollback-first
branch and cannot be replaced by an event-name-only routing assumption.

## Recommended transport and admission boundary

Use a separate gamification queue and consumer identity in the API-owned headless
artifact. Existing Activity v1/v2 marker and retry history remain untouched.
Queue jobs carry only a versioned destination/admission reference, not a copy of
canonical payload, credentials, user content, metadata or a client-supplied award.
Keep the same source eventId for owner idempotency; publication attempt tokens
and operator retry cycles are technical coordinates, not new business events.

Before enqueue, persist an immutable destination admission/capsule and its safe
projection revision, linked to B's delivery and canonical source. Preparation
must validate the current publication claim and source eligibility atomically.
Only after durable preparation may queue IO occur. A consumer can arrive before
B acknowledge commits, or after publication recovery changes the row to WAITING
or BLOCKED; an admitted capsule remains valid. Do not require QUEUED as the sole
admission condition or overwrite B's receipt with a false award acknowledgement.
No owner effects occur in admission preparation or within a Redis transaction.

One logical consumption record is keyed by destination+eventId, independent of
publication cycle. Separate publication state from consumption state. Proposed
logical states are pending, running, retry-due, completed and blocked, with
attempt history and a unique current claim token. These names are a proposal,
not an authorized enum/migration. Late callbacks use token-CAS; they cannot
replace a newer consumption result. Queue completion is not authoritative.
Reconciliation must recover admitted-but-not-enqueued and consumed-before-queue-
ack windows without erasing the original immutable admission or original failures.

Lease fencing protects technical rows; it cannot cancel an owner transaction
already running. Do not promise exactly-once or ordering from a lease alone.
Preserve owner idempotency, prove concurrent duplicate/partial-success behavior,
and address source reversal ordering before automatic consumption is accepted.

## Safe facts and mutable rules

Producers own versioned declarations of safe event facts. Points/Achievements/
Levels own narrow requirements and applicability semantics; root composes them.
Features must not import foreign services, repositories, Prisma clients or a
general rule engine. Core Events owns canonical-source reading; root may compose
its infrastructure adapter with owner capabilities. Never log unrestricted
source JSON or exception messages that include user payload.

Prepare only producer-approved facts, per owner, rather than broadcasting the
entire source envelope to all three commands. Preserve meaningful absence and
current valid optional-value/recipient semantics. Malformed facts require a
controlled projection failure, not string coercion, invented IDs or success.
Do not serialize rejected private values into a failure/DLQ/audit row.

Configured event names and recipientPayloadKey mean a hard-coded event allowlist
or a projection of only today's enabled rules can silently lose future valid
work. The detailed protocol must inventory existing rules and current/future
producer declarations, including derived Points events and rollback coordinates.
Unknown/unsupported, invalid-supported and valid-owned-no-op must be explicit
technical dispositions. Existing void consumers do not provide that distinction;
agree on owner-local validation/receipt capabilities before adding one. A technical
completed disposition must never claim an award was made.

Recommended direction: include every approved fact for the producer contract in
the immutable capsule, while keeping numerical rules live in their owners.
Validate relevant configuration mutations against registered safe facts and the
derived-event dependency graph under a shared configuration revision protocol.
This requires explicit owner integration; preflight alone is insufficient if
rules can change after activation. Unsafe or unknown live configuration blocks
activation with a content-free report; it must not be silently disabled.
Distinguish that case from declared dormant rules for not-yet-installed Forum/
Knowledge producers: migration defaults do not prove producer availability.
The detailed inventory must report those dormant dependencies explicitly, retain
their rules unchanged, and require the producer's approved fact contract before
admitting its actual events. Do not make the existence of legitimate future
defaults alone an implicit requirement to implement all future modules first.
Do not silently freeze all scoring rules, add a hop cap or change valid formulas.
Exact mutation guards, receipts, unknown-event classification and revision races
are decisions for the next detailed protocol, not runtime authorized here.

## Consumption and failures

The coordinator invokes explicit owner commands sequentially with safe facts.
Each owner retains its transaction, locks, markers, Audit and Outbox. If Points
commits and Achievements fails after a rule commits, replay the logical delivery;
owner markers must prevent repeated effects. Only complete the technical receipt
after all required commands return. Do not wrap the sequence in an invented
cross-owner atomic transaction or record completed before a command finishes.

Points awarded/reversed Outbox rows go through the same durable destination path
to Levels. Test actual source commit→discovery→admission→enqueue→consumer→owner
commit→derived source→second discovery/enqueue→Levels evidence, not a direct
service-call substitute. No direct Levels call may bypass the durable second hop.

Failures belong to this destination and distinguish projection, publication and
consumption. B's QUEUE_ADD_FAILED receipt must not mislabel source/projection
rejection; agree on a narrow publication-contract extension before implementation.
Store bounded codes and source/reference coordinates, not unrestricted errors.
Operator retry must identify the original admission and destination; neither
Activity eventId-only DLQ resolution nor blind queue.add is sufficient. D will
define the operator interface, retry cycles, retention and audited resolution.

## Blocking ordering characterization

[DEBT-090](DEBT_090_ACHIEVEMENT_ROLLBACK_ORDER.md) records a migrated service
sequence: empty rollback→late original leaves an active Achievement award until
rollback is explicitly replayed. Queue order, a fresh delivery ID, an outer marker
or one worker concurrency setting does not establish monotonic source rollback.
No current automatic-delivery production incident or concurrent race is claimed.
Resolve the owner policy and prove its serialization/replay contract separately;
do not patch Achievements secretly as part of root queue wiring. C acceptance
must include this gap's disposition and the real source-order tests.
The policy must also distinguish terminal withdrawal from a later legitimate
qualification or reinstatement. No permanent source ban or automatic restoration
is inferred here; source revision/qualification coordinates require an explicit
owner decision before a durable revocation design is implemented.

## Reviewable implementation order

| Stage                        | Required concrete result before next stage                                                                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1 protocol/characterization | Exact admission/consumption schema and constraints; fact inventory, rule revision protocol, failure budget and source-order policy; deterministic proof schedule |
| Owner ordering correction    | Separately approved DEBT-090 policy/implementation; source rollback and late-original concurrency/replay evidence; no formula change                             |
| C2 persistence/projection    | Approved additive migration and named ports; immutable safe admission, CAS completion/recovery, config races, query plans and no secret in any failure surface   |
| C3 queue/runtime integration | Identifier-only queue publisher/consumer, actual headless lifecycle, real Points/Achievements effects, second-hop Levels and crash/replay evidence               |
| D operations and activation  | Isolated operations, pause/resume, retention, operator-run preflight, immutable UTC cutoff, excluded historical counts and explicit activation approval          |

This ordering preserves the full C goal; it does not replace it with a mock queue,
direct-call demo or publication-only success. No runtime stage, migration, queue,
worker startup or activation is allowed by accepting characterization alone.

## Required proof matrix

- Enqueue accepted but acknowledgement lost; consumer wins before publisher ack;
  publication recovery/blocked state after a real enqueue; duplicate cycle jobs.
- Crash after each owner/rule commit and before the outer receipt; concurrent
  duplicate delivery; stale completion/failure; no duplicate ledger/Audit/Outbox.
- Points reversal before/after original, absent historical original, replay and
  daily caps; Achievements rollback before/after/overlapping a late original.
- Missing/changed recipient, unknown event, malformed approved fact, unsupported
  rule, configuration change during projection/admission/consumption, and cycles.
- Real two-hop Levels result; Activity retry isolation in both directions; poison
  delivery isolation; no private payload in Redis, failures, diagnostics or logs.
- Disposable migrated PostgreSQL/Redis, exact-head complete quality gate/CI,
  no skipped E2E, timeout inflation, sleep synchronization or retry-to-green.

The design packet's full gate and CI remain pending at this checkpoint. Its
focused4/4 proof establishes the stated legacy behavior only. No acceptance of
C, DEBT-007, D7, stack audit or Phase11 follows from this document.
