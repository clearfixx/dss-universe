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

## Verification

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
- Existing HTTP compatibility passed with the complete focused set: 45/45.

Exact runtime/test/config head `47506cf96f267f60ede3d94623f9950268fe0b87`
passed local `quality:full`, exit 0, on 2026-11-16 at 08:18:54–08:40:28 UTC.
API coverage: 1591/1591 across 186 suites; the new orchestration service meets
100% branches/functions/lines/statements. E2E: 913/913 across 79 suites, with
zero failures, pending or todo. Coverage ran in all five executable workspaces;
build 6/6 and fresh Web smoke 15/15 without retries passed. The exact-interval
System Kernel-Power 42/107 query succeeded and found zero sleep events.

Same-head CI passed 8/8: Quality run43830206610, native run43830206529 and
containment run43830206840. Main job133173583087 confirms API1591/1591,
E2E913/913 and build6/6; Web job133173583153 passed. Native verification passed
on Windows/Linux/macOS. A subsequent evidence-only documentation update is not
represented as another local full gate.

The first full attempt at `fc51fc9` failed the exact architectural export list:
the new named capability/types were missing from its expectation. Commit47506cf
adds only those explicit exports; the check remains closed and all142 architecture
tests pass with zero frozen findings. The red log remains at
`node_modules/.cache/qualified-points-full-b6a684076cd949638cc4d52260b1408f.log`.
Earlier candidate fixture/SQL failures remain recorded in the focused logs;
they are not accepted runtime behavior or additional reopened debts.

Successful full log:
`node_modules/.cache/qualified-points-full-85fb5717a2694c6985272f173de431bb.log`.
Machine-readable API/Web evidence: `node_modules/.cache/quality-full-BSXalL/`.
The verification helper is retained in
`tools/agent-helpers/gamification/run-qualified-points-verification.ps1`.

Deployment adds the four tables before code rollout. Historical migration files,
existing balances, old receipts and processed-event markers are not rewritten.
