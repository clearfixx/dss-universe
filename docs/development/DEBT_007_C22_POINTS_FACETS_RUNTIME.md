# DEBT-007/090 — qualified Points owner implementation

This package implements the Points owner boundary from the accepted
[facet protocol](DEBT_007_C22_POINTS_FACETS_PROTOCOL.md). It remains inactive:
no runner, queue, producer adapter or automatic award is enabled by importing it.

## Durable owner behavior

`QUALIFIED_POINTS_CONSUMER.advance` validates a bounded version-1 command and
checks recipient existence through the existing ID-only Users port. CONTROL
always precedes CONTRIBUTION. Each facet commits its own immutable receipt with
its ledger, Audit and Outbox effects. A failed second facet can resume without
repeating the committed first facet. Replays retain the original APPLIED,
NO_MATCH, CAPPED or SOURCE_REVOKED outcome despite later numerical rule edits.

Four additive tables retain source cursors, immutable qualification/withdrawal
facts, entry bindings and facet receipts. Retirement is monotone; a late event
cannot restore a retired qualification. A separately attested new qualification
may contribute again. Version 1 permits at most three supplied facts and one
contribution per qualification. It does not scan an unbounded source history.

The legacy and qualified paths share event/source/entry/cap synchronization and
the existing ledger writer. Exact legacy ledger/marker evidence can be adopted
without awarding twice or rewriting history. Missing, conflicting or ambiguous
evidence blocks qualification. Enrolled sources cannot subsequently bypass this
boundary through the unqualified legacy award/source-reversal path. Ordinary
manual entry reversal remains supported.

The root must attest canonical producer evidence before invoking this capability.
The owner does not query foreign producer tables or treat arbitrary payloads as
proof. Root admission, producer coverage, descriptor versioning, durable delivery,
activation preflight and activation remain unfinished work under DEBT-007/090.
This package alone does not close either debt, D7 or the audit.

## Verification in progress

- Migrated private DB suites: 44/44, including both physical lock orders for
  award/withdrawal and manual/source reversal, same-event concurrency, cap races,
  namespace conflicts, exact legacy adoption and immutable SQL guards.
- Injected Audit/Outbox/receipt failures roll back the current facet while
  preserving a completed CONTROL facet.
- A thousand unrelated source facts leave measured query count unchanged;
  this establishes bounded query work, not a production latency guarantee.
- Unit and assembly suites: 62/62. Named exports, singleton providers and
  bootstrap inactivity are checked.
- Disposable public migration deployment succeeded; Prisma reports zero drift.
- Existing HTTP compatibility, full quality gate and final-head CI are still
  required before acceptance. No successful complete gate is claimed here yet.

Deployment adds the four tables before code rollout. Historical migration files,
existing balances, old receipts and processed-event markers are not rewritten.
