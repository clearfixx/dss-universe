# DEBT-007/090 — Reputation admission with qualified Points

This inactive integration connects the accepted Reputation producer evidence to
both qualified owner inputs. The Points owner was accepted in PR164, merged as
`8c34e8d`. No queue, runner or deployment activation is supplied here.

## Compatibility and ownership

New admissions use codec 2 / `reputation.qualification` descriptor 2, with Points
and Achievements explicitly applicable. Existing codec-1 seals keep their exact
bytes, digest, applicability and completion flags. Reuse occurs before looking up
a newer mutable producer view; old admissions do not acquire a Points obligation.
The SQL migration expands the supported codec set to 1/2 without rewriting rows,
dropping immutable history or increasing size limits. Codec 3 remains rejected.

The root uses the existing Reputation-owned reader and Core canonical evidence
comparison inside the caller's Repeatable Read admission transaction. A second
bounded owner view from that same snapshot supplies original qualification
metadata for exact Points legacy adoption; it is not a later independent read.
Root calculates no balances, weights, award eligibility or level transitions.

The codec copies bounded plain Points data before calling a named pure owner
shape predicate. It rejects accessors, sparse arrays, excess depth/work and
cross-owner event/fact/recipient/value/contribution mismatches. Database and
unexpected provider failures retain their identity. The predicate does not expose
a mutable service, transaction client or persistence capability.

## Scoped evidence

- Unit/codec/boundary tests: 60/60.
- Migrated producer/admission/consumption/owner suites: 113/113 across eight
  suites, including actual canonical Reputation writes and actual Points effects.
- Normal award then withdrawal retires the original contribution once. Withdrawal
  before an older sealed contribution prevents that delayed award.
- A real legacy grant created before fixture activation is not routed for
  historical replay. A new attested withdrawal adopts its exact evidence and
  reverses it once, preserving its original ledger row and marker.
- A stored codec-1 admission is reused byte-for-byte without Points work.
- Existing claim fencing, rollback, continuation, storage, assembly and bounded
  producer-query regressions remain required and passed in the scoped set.
- Disposable migration deployment passed and Prisma reports zero schema drift.

The first candidate had an untyped empty-array TypeScript error; the array now
has the explicit Points fact type. The initial storage negative used newly
supported codec 2; it now tests unsupported codec 3. Those failed logs are
retained. Neither correction changes accepted economic behavior or waives a gate.
Full local gate and final-head CI are pending; no complete acceptance is claimed.

Other producer descriptors/configuration guards, Points-to-Levels delivery,
consumer coordination, queue/recovery and operational activation preflight remain
unfinished DEBT-007 work. This integration does not close DEBT-090, D7, the stack
audit or Phase11 preparation by itself.
