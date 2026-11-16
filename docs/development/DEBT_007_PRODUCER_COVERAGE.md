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
93/93. Architecture checks: 142/142 with zero inventory findings. Full gate and CI remain
pending at this checkpoint; final acceptance evidence belongs in the PR and D7
closure reconciliation. DEBT-007/090 and D7 are not closed by this package alone.
