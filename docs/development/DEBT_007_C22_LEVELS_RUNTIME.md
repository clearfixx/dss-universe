# DEBT-007 — C2.2 Levels synchronization L1

Baseline: accepted PR154, main `84341b6`. Runtime L1 was separately authorized
after acceptance of the design. This package does not activate gamification.

## Transaction and ownership

Levels acquires its existing per-user advisory transaction lock before reading
the authoritative Points balance. Points owns the transaction-bound aggregate;
Levels owns definition reads, target calculation, transitions and the existing
`dss.api.levels` marker. Root supplies one transaction and calls the pure target
derivation supplied by Levels. No business contract exposes Prisma.

Transition history, marker, Audit and Outbox commit together. Existing event
names, payloads, threshold formula, reversal handling and void runtime facades
remain unchanged. There are no new tables, transaction isolation/timeout options,
queue processors, activation switches or frontend changes.

The lock serializes Levels consumers for one user; it does not freeze concurrent
Points writers or definition administration. A subsequent consumption reads the
current committed balance. This is not an exactly-once delivery guarantee or a
new globally consistent snapshot policy.

## Regression evidence

The original failing-order characterization remains recoverable from PR154/Git.
`levels-synchronization.e2e-spec.ts` replaces it with fixed-behavior regressions:

- distinct events physically contend on the same PostgreSQL user lock, with
  balance reads of 10 then 120 and no stale downward transitions;
- duplicate simultaneous delivery creates one marker and one effect set;
- another user completes while the first user's balance read is held;
- balance/definition failures preserve failure identity and produce no effects;
- Audit, Outbox and final-marker failures roll back all owned effects;
- one balance aggregate and one definition query follow the lock, and a real
  Points reversal preserves downward transition behavior.

The focused migrated DB run passed 15/15 across synchronization, existing Levels
HTTP foundation and both runtime assembly suites. Initial focused unit/assembly
tests passed 21/21. These are candidate-tree checks, not final acceptance; the
committed head still requires the full quality gate and CI.

## Remaining work

L1 does not complete C2.2. Points control/contribution facets and durable named
outcomes, C2.3, C3 and activation/runbook package D remain separate obligations.
DEBT-007, DEBT-090 and D7 remain open. No historical replay is enabled.
