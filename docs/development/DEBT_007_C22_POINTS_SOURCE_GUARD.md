# DEBT-007 — C2.2 Points source guard

Baseline: owner-accepted PR161/main `2c6eb36`. The owner separately authorized
this narrow runtime correction. It does not implement qualified facet receipts,
publication-cycle identity, automatic delivery or activation.

## Change and guarantee

`PrismaCommunityPointsRepository.award` now acquires the same source advisory
transaction lock as `reverseSource` before reading source revocation. A private
`lockSource` method retains the existing coordinate exactly:
`community-points-source-reversal:${sourceType}:${sourceId}`.

The order is event lock/duplicate check → optional source lock/revocation read →
optional user/rule/UTC-day cap lock/count → ledger/marker/Audit/Outbox commit.
Source reversal already holds that source lock through its own transaction.
No affected path acquires a source lock after a cap lock. Direct-entry reversal
is unchanged; this package does not claim its broader qualified-writer proof.

Under the existing Read Committed writer semantics, either award commits first
and source control sees/compensates it, or control commits first and award sees
revocation before inserting. There is no new global or per-user guard;
existing quota locks still apply. Source-less awards retain the old event/cap path.

Legacy statuses/envelopes, rule selection, signed weights, cap counting, event
idempotency, transaction options and evidence payloads are unchanged. There are
no tables, migrations, timeout/isolation changes, queue or frontend changes.
Existing historical ledger data is not repaired or replayed automatically.

## Evidence

PR161/Git retains the original deliberately bad-order characterization. The
current source-synchronization suite replaces it with eight fixed-behavior cases:

- sequential award/control and revoked-source suppression remain compatible;
- a held real award INSERT makes control visibly wait on the award backend;
  release yields one original and one compensation, balance zero and exact
  marker/Audit/Outbox counts;
- a held real revocation INSERT makes award visibly wait on control; after
  release the award is IGNORED and no ledger entry exists;
- another source for the same user completes while the first source is held;
- source-less concurrent duplicate delivery yields one award;
- Audit and Outbox failures roll back ledger/marker/evidence and release the
  source guard, allowing subsequent source control to complete.

The barriers use only new synthetic INSERT triggers in an owned migrated schema
and actual `pg_blocking_pids` observations. Production immutability triggers stay
enabled. No sleeps, retries or timeout increases are used. Synthetic profiles and
events do not prove login, HTTP admission or canonical producer qualification.

Focused verification passed17/17 across source synchronization, existing cap
audit and existing HTTP ledger suites. API typecheck and targeted lint passed.
These are candidate-tree results; committed-head full gate and CI remain required
before package acceptance.

Qualified Points facets, cycle/provenance binding, shared direct-reversal review,
C2.3/C3/D and final D7 remain open. This guard closes only the reproduced future
award/source-control interleaving after separate owner acceptance.
