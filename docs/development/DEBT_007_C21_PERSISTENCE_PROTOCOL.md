# DEBT-007 — C2.1 inactive persistence protocol

Baseline: accepted main `c3b67ab`, including design PR151.
Status: concrete proposal in preparation; no runtime or migration authorization.
This refines [C2](DEBT_007_C2_ADMISSION_DESIGN.md), preserving all C1 requirements.

## Five proposed records

All IDs below are UUID unless explicitly TEXT. Times use TIMESTAMP(3) with the
existing UTC clock convention. Foreign keys use RESTRICT for delete/update.
Migration creates no activation row, cutoff, receipt or automatic runner.

### Admission

`gamification_admissions`:

- `id` primary key; `destination` VARCHAR(64); `eventId`; unique
  `(destination,eventId)`; unique `(id,destination)` for receipt consistency.
- Composite FK `(destination,eventId)` to existing B delivery.
- `cutoff` non-null timestamp; `descriptorId` VARCHAR(128);
  `descriptorVersion` positive integer; `codecVersion` positive integer.
- `projection` JSONB; `projectionDigest` BYTEA, exactly 32 bytes;
  `createdAt` UTC clock default.
- All fields immutable after INSERT; DELETE rejected until a separately reviewed
  D retention protocol exists. Digest is an equality/integrity aid, not proof of
  producer authority or permission to replace structural comparison.

### Receipt

`gamification_consumption_receipts`:

- `admissionId` primary key; `destination`; composite FK to Admission.
- `state`: READY, RUNNING, RETRY_DUE, COMPLETE or BLOCKED.
- `epoch` BIGINT default 0; `claimSequence` BIGINT default 0;
  `technicalFailures` integer default 0. All nonnegative.
- `claimToken` nullable UUID; `claimedAt` and `leaseUntil` nullable timestamps.
  RUNNING requires all three, with leaseUntil greater than claimedAt; every other
  state requires all three null. Unique claimToken when non-null.
- `availableAt` nullable timestamp: required for READY/RETRY_DUE; absent for
  RUNNING/COMPLETE/BLOCKED. `blockCode` VARCHAR(64) is non-null only for BLOCKED.
- `pointsDone`, `levelsDone`, `achievementsDone` booleans; `createdAt`, `updatedAt`.
  COMPLETE requires all flags true. Flags may only advance false to true.
- `(destination,state,availableAt,admissionId)` due index and
  `(destination,state,leaseUntil,admissionId)` recovery index. Query LIMIT is a
  batch size, not a hidden cap on eventual work.
- Receipt deletion and epoch mutation are unavailable in C2.1. Future audited D
  retry needs a reviewed guard extension; application SQL must not bypass this.

### Attempt

`gamification_consumption_attempts`:

- `id` primary key; restrictive `admissionId` FK; `epoch`, `claimSequence`;
  unique `(admissionId,epoch,claimSequence)` and unique `claimToken`.
- `startedAt`; `state` OPEN/COMPLETE/CONTINUED/FAILED/EXPIRED/BLOCKED/FENCED;
  nullable `finishedAt`, nullable bounded `code` VARCHAR(64).
- OPEN has no finish/code. Terminal state requires finishedAt; failure/block
  states require their reviewed code. One OPEN-to-terminal transition only;
  identity and terminal history cannot be updated/deleted.
- History index `(admissionId,epoch,claimSequence)` doubles as the unique key.
  Recovery settles the exact former token's attempt in the same receipt tx.
  Stale callback does not rewrite an already EXPIRED attempt as FENCED.

### Progress

`gamification_owner_progress`:

- Composite primary key `(admissionId,owner)`; owner currently ACHIEVEMENTS.
  Restrictive admission FK; future owner values require reviewed codec support.
- `codecVersion` integer = 1; `coordinates` JSONB; `updatedAt`.
- Coordinates are O1 scope plus decimal-string generation/sequence. They are
  owner-local opaque resume evidence, not a root-owned lifecycle counter.
- Update only in a current receipt epoch/token transaction. Preserve on technical
  failure; do not clear simply because a new root claim begins. Cross-admission
  generation changes may be legitimate: root validates shape and lets the owner
  adjudicate meaning, rather than imposing a false globally monotonic rule.

### Admission rejection

`gamification_admission_rejections`:

- `id` primary key; `destination,eventId` restrictive B delivery FK;
  unique `claimToken`; `cycle,cycleAttempt`; `observedAt`.
- `descriptorId/version` nullable as a pair when unknown; bounded `code`.
- Append-only. It records verified rejection, not an unknown thrown exception.
  Rejection atomically blocks the exact publication claim and clears its lease.
  It creates neither a receipt nor a fake B queue-failure history row.

All CHECKs and transition triggers need migrated negative tests, including direct
SQL attempts. A TypeScript enum or repository test alone cannot prove a database
invariant. Insert-time relationship checks that need other rows require locked
transactional operations, not invalid cross-table CHECK expressions.

## Root repository capabilities

Proposed named, immutable capabilities contain no Prisma, queue client or owner
service. TransactionClient is confined to root infrastructure implementation.

| Operation       | Input                                           | Result and transaction obligation                                                                                                                                                                 |
| --------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| prepare         | Exact B PublicationClaim                        | CREATED/REUSED with admission identity; STALE_CLAIM; or REJECTED bounded code. Canonical preparation, admission/receipt insertion and rejection settlement are mutually exclusive atomic outcomes |
| claim           | Explicit destination, bounded limit             | Receipt claims containing admissionId, epoch, sequence, token and lease; ACTIVE only; append OPEN attempt atomically                                                                              |
| load            | Exact receipt claim                             | Fenced verified seal plus owner done flags/progress, or STALE; never reconstruct an IntegrationEventJob from untrusted queue JSON                                                                 |
| completeOwner   | Exact claim and owner-owned bounded disposition | APPLIED/STALE; CAS flag and last-owner COMPLETE settlement together                                                                                                                               |
| continueOwner   | Exact claim and validated O1 outcome            | APPLIED/STALE; save coordinates, READY wake-up and CONTINUED attempt atomically                                                                                                                   |
| fail            | Exact claim and reviewed technical code         | APPLIED/STALE; increment technicalFailures, schedule retry or BLOCKED, settle attempt                                                                                                             |
| recover         | Destination and bounded limit                   | Number settled; expired RUNNING rows only, same token/epoch, accepted pause bookkeeping                                                                                                           |
| rejectAdmission | Exact B claim and bounded projection rejection  | APPLIED/STALE; B claim settlement and append-only rejection together                                                                                                                              |

Do not expose caller-controlled SQL fragments, arbitrary destination strings or
patch-shaped partial updates. Destination is validated against the registered
gamification destination. The operation names describe a contract proposal, not
already published exports.

## Seal identity and legitimate source evolution

A subtle retry case needs explicit treatment: P1 prepares the current Q/W/E view.
After a valid withdrawal, preparing the old direct event again can legitimately
include newer control evidence. Recomputing that projection and comparing it to
an earlier seal would misclassify normal lifecycle evolution as a conflict.

Therefore prepare locks and checks existing admission identity before asking a
producer for a fresh view. If a seal already exists, validate its codec, digest,
cutoff, descriptor identity and canonical identity; reuse the sealed command.
Do not refresh its producer facts or replace it. New withdrawal events carry the
new control evidence through their own admissions and owner revision guards.
If immutable event identity itself conflicts, block with separate evidence.
This refines C2's exact-reuse rule; it does not permit arbitrary stale facts to
become newly attested evidence.

Before runtime acceptance, test direct admission, concurrent withdrawal, recovery
and direct retry against the same sealed identity; then prove late direct work
cannot restore an owner effect withdrawn by the newer qualified command. A
duplicate-event-only test would miss this sequence.

## Codec limits proposed for review

Codec V1 is a strict tagged envelope, not arbitrary `QualifiedAchievementCommand`
serialization. It declares descriptor/version, canonical identity, safe owner
inputs and owner applicability. Reject unknown keys, non-finite numbers,
prototype-bearing input and unsupported tags; decoder repeats validation when
reading stored bytes. No metadata, content, reason text, credentials or driver
errors are accepted. Canonical field names/order and integer formatting are fixed
before digesting UTF-8 bytes; do not hash arbitrary JSON.stringify insertion order.

Propose 256 KiB total encoded UTF-8 bytes and 16 KiB per opaque string, with no
truncation. Descriptor IDs are ASCII identifiers up to 128 bytes; destination
matches B's fixed constant. UUID syntax and positive decimal revisions are
validated separately. P1 V1 has at most three Q/W/E facts; that fact-count limit is
descriptor-specific, not a universal cap on future producer histories or O1 pages.

Current producer/source identifiers are unbounded SQL TEXT, so these proposed
limits are not proven compatible merely because ordinary fixtures use UUIDs.
Before implementing them, inventory existing evidence lengths using aggregate
metadata only, test exact UTF-8 boundaries and report incompatible legacy rows.
Oversize is an explicit blocked/review disposition; no historical data rewrite,
silent clipping or hidden result limit is allowed. Other descriptors need their
own reviewed field limits before activation.

## Remaining decisions and proof

The destination configuration guard/counters belong to C2.3. C2.1 cannot pretend
that accepting a caller's `verified=true` flag supplies that guard. Its inactive
assembly needs a root-owned fixed descriptor registry and explicit unconfigured
failure; no App import or production preparation route is added. Full live-rule
compatibility remains an activation prerequisite, not silently waived.

Next work: concrete closed code sets, deterministic canonical encoding, complete
SQL trigger transition matrix, query factories and migrated characterization.
After those are reviewable, request separate C2.1 runtime authorization. No queue,
owner effects, automatic awards, ACL changes, frontend or Phase11 work is part of
this proposal. DEBT007/090 and final D7 remain open.
