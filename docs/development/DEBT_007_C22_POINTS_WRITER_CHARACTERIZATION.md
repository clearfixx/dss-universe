# DEBT-007 — C2.2 Points source-order characterization

Baseline: accepted L1/main `d24d151`. This package contains tests and evidence,
not a runtime fix. It investigates the shared-writer prerequisite in the accepted
Points facet protocol (PR160). DEBT-007/090 and D7 remain open.

## Reproduced schedule

Real `CommunityPointsService`, its Prisma repository, Audit and Outbox operate
against a separately owned fully migrated test schema. Synthetic subjects/events
are not login, HTTP, producer qualification or automatic-delivery evidence.

A test-only BEFORE INSERT trigger delays one synthetic original ledger INSERT
using a PostgreSQL advisory lock held by a separate control connection. The
production award has already performed its actual revoked-source check. A real
`pg_stat_activity`/`pg_blocking_pids` observation establishes the INSERT waiter;
there is no sleep, mocked balance/query, disabled production trigger or timeout
increase. Only the new synthetic trigger/function are removed afterward.

1. Award reads that its `ReputationEntry` source is not revoked, then waits at
   the physical INSERT barrier.
2. Source reversal takes its source lock, writes the permanent revocation and
   finds no committed original entry. It commits with the current legacy result
   `AWARDED` and `entry: null`.
3. Releasing the barrier allows award to commit a genuine `+10` ledger entry,
   processed marker, Audit and Outbox despite the committed source revocation.
4. The original has no compensating reversal. Balance is 10.
5. Repeating the same control returns `DUPLICATE`, leaves the entry uncompensated
   and leaves balance 10. This legacy retry does not repair the demonstrated
   ordering.

The focused suite passed3/3 in 4.068 seconds. Its two sequential controls prove
that award-then-control balances to zero, while control-then-award suppresses
later events with the same legacy source key. Log:
`node_modules/.cache/debt007-c22-points-source-d140fbe318b74cca835f92e73fb0c9b5.log`.

This establishes the controlled owner-level schedule, not natural incident
frequency, production exploitation or a failure of canonical producer admission.
It does not claim that newly published cycles should reuse the legacy source key.
The current permanent key cannot itself identify independent publication cycles;
their explicit producer-attested binding remains required in C2.2/C2.3.

## Proposed narrow runtime correction

For a source-bound award, acquire the existing source-reversal advisory coordinate
before checking revocation and retain it through ledger/marker/Audit/Outbox commit.
Keep event → source → optional daily-cap order. Source reversal already holds that
source coordinate. No writer in this proposed narrow change acquires event or cap
after holding them in the opposite order.

The resulting permitted schedules are award-first (control sees and compensates
the committed award) or control-first (award sees revocation and creates no award).
Source-less awards retain their existing path. Preserve legacy status/envelopes,
cap/formula semantics, isolation and timeouts. No schema change is required for
this narrow guard; this does not implement qualified facet receipts or solve
cycle identity by renaming a legacy key.

Runtime implementation requires separate review. It must replace the deliberate
bad-order assertion with deterministic regressions for both lock winners,
same/different-event delivery, unrelated-source independence and atomic failure
behavior. Shared synchronization for direct-entry/source reversal and complete
qualified facet behavior remain explicit requirements, not closed by this guard.

## Verification status

Focused migrated tests3/3 and API typecheck passed on the candidate working tree.
Helper syntax was checked. Full committed-head quality gate and CI remain pending;
the focused result is not package acceptance. No runtime, UI, migration, queue or
activation changes are included.
