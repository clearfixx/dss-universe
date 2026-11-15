# DEBT-007 — C2.2 Points facet protocol

Status: proposed design; no runtime, migration or activation is implemented by
this document. Baseline: accepted main `84341b6`. Levels L1 is independently
verified in PR159 and awaits owner acceptance; it is not included in this branch.

## Problem and preserved behavior

The legacy Points consumer handles `reputation.direct.reversed.v1` by reversing
the source and returning before contribution-rule matching. This cannot prove
that a separately applicable contribution completed. The accepted C2 design
requires both facets when a producer descriptor explicitly declares both.

Ordinary consumption selects enabled matching rules by payload specificity and
key, stopping at the first non-IGNORED result, including CAPPED and DUPLICATE.
Keep that policy, signed weights, UTC cap counting, immutable ledger, compensating
reversals and existing void facades. Do not create a default reward for reversal
events: the historical initial migration seeds no such contribution rule.

Current `reputation.qualification` admission v1 explicitly declares POINTS and
LEVELS false and ACHIEVEMENTS true. A Points capability must not silently change
that codec, infer applicability from a rule, or activate automatic consumption.
Root descriptor integration and complete producer coverage remain separate work.

## Owner contract

Expose a separately named qualified Points capability. Existing consumer and
successful REST/GraphQL responses remain unchanged. The command contains a
versioned canonical event identity, its bounded owner-relevant fields, one
explicit attested recipient, producer-owned references and explicit applicable
CONTROL/CONTRIBUTION facets. Root validates canonical evidence; Points validates
the owned command and retains all economic policy.

Do not pass Prisma, root receipt IDs, delivery tokens, caller SQL, arbitrary
private producer payloads, mutable services or a current numerical rule snapshot
through this business contract. The legacy fallback order `userId`, `authorId`,
`recipientId` remains a legacy behavior; a qualified command must not silently
choose between conflicting attested recipients.

Return COMPLETE only when every requested facet has a durable terminal result.
Each facet result retains its original disposition and a separate replay flag.
Do not replace an original CAPPED or NO_MATCH result with a lossy DUPLICATE status.
Unknown failures propagate to technical recovery, rather than becoming NO_MATCH.
A bounded BLOCKED result identifies incompatible evidence or command reuse.

| Facet        | Terminal disposition | Meaning                                                        |
| ------------ | -------------------- | -------------------------------------------------------------- |
| CONTROL      | APPLIED              | Source control and all required compensating effects committed |
| CONTROL      | NO_SOURCE_EFFECT     | Control committed with no additional ledger reversal           |
| CONTRIBUTION | APPLIED              | One selected contribution committed                            |
| CONTRIBUTION | NO_MATCH             | Applicable contribution had no enabled matching rule           |
| CONTRIBUTION | CAPPED               | Existing cap prevented the selected contribution               |
| CONTRIBUTION | SOURCE_REVOKED       | Existing source-revocation policy prevented contribution       |

Inapplicability comes from a verified descriptor, not an empty array. An
inapplicable facet requires no fabricated owner receipt. Root may mark its Points
step complete only after every applicable facet reports COMPLETE.

## Proposed additive owner receipt

Use one Points-owned immutable receipt per `(canonicalEventId, facet)`, not a
second economic ledger and not a replacement for historical processed markers.
The detailed migration must enforce the following exact semantic fields:

| Field               | Constraint and purpose                                                         |
| ------------------- | ------------------------------------------------------------------------------ |
| canonicalEventId    | Canonical UUID; part of the unique facet coordinate                            |
| facet               | CONTROL or CONTRIBUTION; part of the unique coordinate                         |
| contractVersion     | Initially 1; unsupported versions fail closed                                  |
| commandDigest       | SHA-256 of the versioned canonical owned command, excluding numerical settings |
| recipientId         | Explicit owned subject reference; no profile or credential data                |
| disposition         | Finite facet-compatible terminal disposition above                             |
| ruleKey             | Selected rule for APPLIED/CAPPED/SOURCE_REVOKED where rule selection occurred  |
| contributionEntryId | Owned ledger reference for CONTRIBUTION/APPLIED only                           |
| sourceRevocationId  | Owned revocation reference where CONTROL evidence requires it                  |
| createdAt           | Database creation time; no update/delete operation                             |

The migration protocol must specify nullability/check constraints and restrictive
owned references before implementation. Do not add an FK to root delivery or
admission storage. Do not store raw source payloads, arbitrary reasons or arrays
of every reversed entry in this receipt. The ledger remains authoritative for
amounts and individual reversals. A single contribution retains the existing
unique `CommunityPointEntry.sourceEventId` constraint.

Receipt identity binds immutable canonical and producer references, event
version/time, recipient and facet semantics. It must not depend on later numeric
rule edits or newly observed source state. Reusing the same coordinate with a
different command digest is BLOCKED, never an overwrite or another award.
Structural descriptor changes and their configuration guards belong to C2.3.

## Commit and recovery protocol

1. Validate bounded command shape and attested applicability before writes.
2. Process CONTROL before CONTRIBUTION when both are required.
3. Under the owner synchronization boundary, read the requested facet receipt.
   An exact receipt returns its stored disposition; conflicting identity blocks.
4. A missing facet executes its owned policy and commits its receipt alongside
   its ledger, Audit and Outbox effects in the same transaction. No-effect
   terminal results also receive a receipt. Do not emit a fabricated economic
   Audit/Outbox event solely to represent NO_MATCH.
5. The next facet has its own atomic transaction. A crash after CONTROL commit
   therefore resumes CONTRIBUTION without repeating control effects.
6. Only after all required results are durable does the capability return
   COMPLETE. Root receipt CAS occurs separately and does not replace owner
   idempotency. A lost root acknowledgement safely replays the owned command.

No timeout/isolation change, global serialization, broker work or external IO
belongs inside these owner transactions. Numerical settings can affect an
uncompleted facet under C1; a completed receipt is never recalculated after an
administrative rule change. This does not promise exactly-once delivery.

## Legacy compatibility decision proposed for review

Historical event-wide markers cannot establish both facets. Preserve every old
marker, source revocation and ledger row; no renaming, deletion or backfill.

- An exact owned ledger/marker binding may establish an already applied
  contribution only when it proves the same recipient, event and requested
  semantics. The detailed implementation must enumerate that proof predicate.
- An existing source-revocation binding can establish control only when it proves
  the requested canonical control, rather than a different later event.
- A source already revoked by a different event is not, by itself, ambiguous
  historical completion for this event. Execute the requested canonical control
  under current owner rules; if it has no additional effect, commit its own
  NO_SOURCE_EFFECT receipt without attributing another event's effect to it.
- Missing or ambiguous evidence yields a bounded LEGACY_EVIDENCE_REQUIRED block.
  Do not award again or claim both facets complete merely to make a receipt green.
- A canonical post-activation event with no legacy effects proceeds normally.
  Historical replay remains disallowed; this compatibility policy is not a
  backfill authorization.

These are proposed compatibility rules requiring explicit review before runtime.
Do not infer a prior NO_MATCH or CAPPED result from the absence of a ledger entry.
Legacy facade behavior itself must remain compatible.

## Shared synchronization prerequisite

Before coding, inventory all qualified and legacy award, direct reversal and
source-reversal writers. Currently ordinary award uses event and optional daily
cap locks; source reversal uses a source lock; direct reversal uses an entry
lock. A new facet-only lock does not prove safe interaction with those writers.

Define one reviewed lock order across event, source, individual reversal and cap
coordinates, with bounded acquisition and post-lock rereads. Relevant existing
writers must participate where needed. Do not introduce a source/entry lock
inversion or solve contention by increasing timeouts. Whether a pre-existing
interleaving actually fails must be established by DB characterization before
claiming an additional defect; this document makes no such runtime claim.

## Required evidence before runtime acceptance

- Same event with both facets: control and configured contribution each finish
  once; no configured contribution is silently dropped by an early return.
- Failure between facet commits: retry preserves the control receipt and effects
  while completing the missing contribution.
- Completed NO_MATCH, CAPPED and SOURCE_REVOKED remain stable across replay and
  numerical rule edits; original dispositions remain observable internally.
- Failure at receipt, ledger, Audit or Outbox insertion rolls back the entire
  current facet without undoing a previously committed other facet.
- Deterministic same/different-event concurrency, daily cap, source withdrawal,
  direct reversal, source reversal and per-user independence; no sleep/retries.
- Exact legacy-effect compatibility and ambiguous-marker blocking; no duplicate
  ledger entries and no invented historical receipts.
- SQL immutability/consistency guards, migrated-schema alignment and bounded
  query/work evidence for the actual protocol, not only service mocks.
- Unchanged successful legacy HTTP/GraphQL contracts, named narrow exports,
  singleton API/headless assemblies and absence of automatic work on bootstrap.
- Full quality gate and final-head CI, followed by separate owner acceptance.

Implementation is a future separately authorized package. This design does not
close C2.2, DEBT-007/090, D7, C2.3/C3/D, stack audit or Phase11 preparation.
