# D4 — Audit evidence branch reconciliation

Date: 2026-10-18 (local). Baseline `f78b6cd` / draft correction PR #39.
Branch `debt/d4-audit-evidence-reconciliation`. No runtime changes.

## Why this packet exists

Achievements audit PR #36 (`d5fa062`) and Media correction PR #37 branched from
Notifications audit PR #35 independently. PR #38 and #39 continued from #37,
so their ancestry did not contain the Achievements test/evidence. That is a
coverage/branch integration gap, not evidence of a lost production feature.

Inspected PR #36 head, files, original test and report before transfer. Its two
commits `46f0f9a` and `d5fa062` are cherry-picked as `6bd42ae` and `f68c42c`.
The matrix conflict was resolved by preserving both Achievements and Custom
Titles sections. No remote PR merged or retargeted; original acceptance remains
open. The transfer does not imply all D4 operations are reviewed.

## Verification boundary

The imported three migrated tests cover distinct-event cap, exact processed/
Audit/Outbox evidence, rollback/retry after Outbox failure and actual pair-lock
wait before quota re-read. They do not prove source/revoke interleavings,
mutable-rule freshness or production queue wiring (DEBT-007).

Fresh combined targeted run includes those three tests and the seven Custom
Titles correction tests: 10/10 PASS across two suites, 16.922s, normal exit 0.
Existing pg concurrent-query warning remains unsuppressed. Complete branch gates are pending; do not
copy prior PR #36 or #39 results as new green acceptance. Runtime/API/schema/
timeout/permission/frontend files are unchanged by this packet. User-owned
STACK_AUDIT_PLAN.md is excluded and unchanged.

Remaining D4 work still includes complete operation/owner-helper reconciliation
across seventeen features, Core/root/Worker, D4.4 public surfaces/ORM isolation
and D4.5 enforcement. D5–D7, stack audit and Phase 11 brainstorm remain later
checkpoints; this packet neither starts nor accepts them.

Checkpoint continued on 2026-10-19: full combined E2E is running on freshly
recreated disposable tmpfs loopback 5435 after exact project/service/binding,
zero-client and empty public-schema checks, followed by migrations, without seed.
Dev DB 5433 is untouched. API coverage/root/adjacent gates are independently
running; GraphQL check follows E2E to avoid concurrent schema writers.
