# DEBT-007: current producer coverage

This package extends the accepted Reputation admission with current News,
Comments and Community Points producers. It remains inactive: no queue runner,
deployment activation or historical replay is introduced.

## Contracts

- A closed catalogue names seven current event coordinates. Discovery examines
  bounded windows of all Outbox rows and inserts only eligible coordinates;
  unrelated notifications still advance the cursor and cannot starve progress.
- News publication uses the current author, publisher and publication decision.
  The current workflow has one publication and no republication operation.
- Comments have a one-way lifetime. Concurrent tombstones share the existing
  comment lock and emit one withdrawal. Existing tombstones are returned without
  a second event or overwritten deletion attribution.
- Community Points ledger events supply the second hop to Levels. Levels reads
  its authoritative balance through the accepted transactional composition;
  neither payload balances nor in-memory results determine level changes.
- Producer event IDs identify qualification/withdrawal facts. A withdrawal's
  distinct event contribution ID is persisted in existing Outbox metadata in the
  producer transaction. Consumers do not invent missing historical identities.
- Owner readers expose only narrow facts. Selected Core projections omit
  unrelated text and metadata; ambiguous or malformed canonical evidence is not
  filtered into an apparently valid unique candidate.
- Source codec-2 descriptors validate producer namespaces and cross-owner
  identity. Existing codec-1 and Reputation contracts remain unchanged.

## Configuration

When delivery is ACTIVE or PAUSED, rule writers reject unsupported enabled event
or recipient configurations atomically. Shared configuration locks serialize
these writes with exclusive control transitions. Supported numeric edits and
disabling remain allowed. Existing dormant future-module defaults remain dormant;
no future producer is fabricated. Inactive configuration behavior is preserved.

Actual deployment preflight must still inspect existing enabled configurations
inside the activation critical section. The low-level fixture control is not
that operational authorization or readiness check.

## Verification checkpoint

Real migrated producer scenarios cover author/publisher distinction, canonical
redaction, comment award and withdrawal, delayed creation, second-hop Levels,
concurrent tombstones, configuration/control locking and bounded discovery.
Negative seal assertions reject recipient, source and namespace substitution.
Core unit tests retain malformed candidates and check selected-field isolation.

Initial candidate failures are retained in local logs. One source helper still
used the Reputation namespace; the generic helper now uses the registered
producer while its Reputation callers retain the strict default. A retirement
assertion incorrectly expected immediate completion, then an extra inventory
page; it now verifies one persisted retirement page followed by completion for
an already enrolled source. A separate query-work run crossed confirmed Windows
sleep and is not acceptance evidence.

Scoped source tests: 9/9; seven migrated regression suites: 78/78. Unit tests:
93/93. Architecture checks: 142/142 with zero inventory findings.

Implementation head `0cc5a914925c2dd74dd84bef4d2836fe7b13a2b3` has CI8/8:
API coverage1608/1608, E2E926/926, Web15/15 without retries and native48/48 on
Windows/Linux/macOS. Migration deployment and zero schema diff passed in CI.
The first local full run recorded coverage1608/1608, then disappeared during
E2E without a final receipt; it is not a successful full gate.

The second exact-head full run exited1 with coverage1606/1608. Two unchanged
Auth database tests exceeded their existing5000ms budgets: fresh Worker-issued
email proof and atomic recovery-code consumption. No assertion mismatch or
causal connection to this package was established. Their code is identical to
the base; CI on the same head passes both. This is an unresolved local timing
observation, not an Auth fix or an excuse to raise deadlines or retry to green.
The failed receipt/log `producer-coverage-full-0583088d8a704411bba7b4df9464a31c`
is retained. The earlier interrupted log is
`producer-coverage-full-ebd55e5a88f641c6adfe6e69fa2b1238`.

The separate supplemental run completed the checks that the failed full run
never reached: E2E926/926 without skips/todo, GraphQL generation, build6/6,
API build entry and fresh Web15/15 without retries. Evidence directory:
`node_modules/.cache/producer-supplement-qIo252`; interval
2026-11-16T20:32:53Z–20:51:31Z. Its receipt explicitly says supplementalOnly;
it does not change the failed full-gate result. The retained helper reuses the
existing quality environment/report/browser policies and performs no retries.

Acceptance uses the successful mandatory full CI checks and scoped/supplemental
local evidence, with the local full-gate failure explicitly retained. Subsequent
documentation/helper-only changes require their relevant checks and final-head
CI, not another expensive local full run. DEBT-007/090 and D7 remain open.
