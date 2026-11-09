# DEBT-007 — C2.2 owner prerequisites

Baseline: accepted C2.1 PR153, main `5dfab2b`.
Status: design and characterization in progress; no runtime authorization or
automatic processing is inferred from this document.

C2.1 was owner-accepted at `9d7849c`, merged as `5dfab2b` with the identical
tested tree. Its exact local full gate exited0 without sleep events; CI8/8,
API coverage1541/1541, E2E866/866, build6/6, Web15/15 without retries and native48/48
on three platforms passed. Admission/consumption persistence remains inactive.

## Purpose and ownership

C2.1 can retain and fence work, but cannot invent owner results. C2.2 must make
Points control/contribution completion explicit and prove that distinct Levels
events cannot finish with a stale derived transition. Keep scoring, rule matching,
daily caps, reversals, level thresholds and event idempotency inside their owners.
Root composes narrow evidence and transaction boundaries; it does not calculate
awards or levels. No frontend or public API redesign is needed.

The currently published Points and Levels consumers intentionally return void.
Their private services return richer results. Preserve those legacy facades;
add separately reviewed named capabilities rather than exposing mutable services
or silently changing a public completion promise into a new economic contract.

## Observed Points behavior

`CommunityPointsService.consume` handles Reputation reversal before ordinary rule
matching. `reverseSource` retains a permanent source-revocation fact and reverses
matching ledger entries. Its result describes duplicate/control effects, not
whether an independently configured contribution rule was considered.

For ordinary events, matching rules are ordered by payload specificity and key.
The first result other than IGNORED ends the loop, including CAPPED and DUPLICATE.
Do not turn this into an all-matching-rules award policy while adding outcomes.
Event markers, ledger, Audit and Outbox currently commit together; UTC daily-cap
locks and existing source-reversal semantics must remain effective.

### Proposed qualified capability

Accept a bounded owner-owned command built from root-attested canonical/producer
evidence. It must identify event/version, recipient, source and independently
applicable control/contribution facets. No admission table, Prisma client or raw
private producer payload belongs in this business contract.

Return named terminal outcomes for each applicable facet: applied, duplicate,
no-match, capped or no-source-effect as appropriate. Do not infer successful
contribution completion from a source-control early return. A root receipt marks
Points done only after the qualified command reports both required facets done.

Each facet needs durable owner idempotency, including no-effect outcomes, beside
its ledger/Audit/Outbox transaction. Reuse of the legacy event-wide marker alone
cannot distinguish two facets. Exact additive records, constraints, migration
compatibility and handling of historical markers remain a design decision; they
are not authorized DDL in this packet. Do not rename/delete old markers or replay
legacy events to manufacture missing facet evidence.

New publication cycles remain distinct producer facts. A late event from a
withdrawn cycle must not reopen it. Numeric rule changes may affect unmarked work
under C1; completed facets stay complete. Structural configuration guards and
producer/predecessor retention are C2.3 prerequisites, not waived here.

## Observed Levels ordering

`LevelsService.consume` checks profile existence, reads Points balance and level
definitions in parallel, derives a target, then calls the repository's sync.
The per-user advisory transaction lock starts inside sync, after those reads.
Same-event deduplication is therefore different from distinct-event ordering.

The characterization uses the real API provider graph and an owned fully migrated
schema. Synthetic profiles are not login/authorization evidence. Real Points
commands create ledger effects and their Outbox events. A test-only barrier holds
the first real balance result before it returns to Levels; it neither replaces
the balance nor skips a database operation. No sleep, timer override, Auth mock,
disabled guard or queue is involved.

Schedule under examination: award10, capture the older event's balance10, award110,
complete the newer event at balance120/level3, then release the older read. Check
both returned transitions, both durable event markers, immutable history and the
fresh progress projection. This proves only this schedule, not natural production
frequency or broker delivery. Results must be retained before claiming a defect.

### Proposed synchronization boundary

Acquire the existing Levels-owned per-user lock before the authoritative balance
read and hold it through owned transition/marker/Audit/Outbox commit. A root
transaction adapter may compose Points-owned scalar reading and Levels-owned
operations through narrow infrastructure contracts. Levels keeps the pure target
calculation; Prisma and lock SQL stay out of its business port.

Do not hold a lock around network work, move Points SQL into Levels, use an old
event's embedded balance as authoritative, or serialize every user globally.
Preserve the current writer isolation/timeouts unless a concrete reviewed design
demonstrates a necessary change. Define one lock order and inventory every caller
of sync, including the legacy facade, before runtime implementation.

The intended guarantee concerns consumption order: once an event obtains the
Levels synchronization lock, its balance read and resulting owned write share
that critical section. Points may continue writing independently; their later
durable events must still be consumed. This is not a promise that history equals
every concurrent ledger state instantaneously or that delivery is exactly-once.

## Evidence and acceptance plan

- Verify published legacy void consumers and unchanged successful REST/GraphQL
  envelopes; unknown failures retain identity.
- Points: independent facets, no-effect markers, duplicates, replay after a
  partial technical failure, daily caps, source cycles and full rollback of
  ledger/marker/Audit/Outbox.
- Levels: deterministic distinct-event schedule above, same-event duplicates,
  per-user concurrency, downward changes and rollback of all owned effects.
- Verify narrow exports, singleton assemblies, headless inactivity and unchanged
  owner formulas; inventory structural writers separately for C2.3.
- Full quality gate and final-head CI precede separate owner acceptance. Runtime
  implementation requires its own concrete, reviewable authorization.

Initial characterization setup attempted to retrieve a provider by class where
the API graph registers it by its published token. That fixture failure is
retained and corrected by resolving the actual token, without production changes.
After that correction the substantive schedule passed1/1: real newer-event work
appended levels1/2/3 at balance120, then the released older read appended3→2→1
at balance10. Both event markers existed and the fresh progress remained level3
at balance120. Thus a stale-history write is reproduced; no runtime fix, loss of
ledger points or natural incident frequency is claimed. Log:
`node_modules/.cache/debt007-c22-characterization-5ca959d6b6574379a14f8821ce7878b9.log`.
The expanded suite passed2/2, including a sequential no-barrier control with
three upward transitions, zero downward transitions and the same final balance120.
Exact source-event assertions attribute the stale downward changes to the earlier
event, not the newer one. Expanded log:
`node_modules/.cache/debt007-c22-characterization-746306ce83d94122a2ffa57459fe5c39.log`.
Final package validation remains pending. DEBT-007/090, D7, stack audit and Phase11
remain open.
