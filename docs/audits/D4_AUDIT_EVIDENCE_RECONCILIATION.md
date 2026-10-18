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

Fresh completed gates: API opt-in coverage 1101/1101, 148 suites, zero skips,
82.201s, normal exit 0. Root lint/typecheck each pass 9 tasks; build passes 6
tasks (39.176s); Prisma validates. Architecture bounded checks pass and frozen
inventory remains 84 known findings, not waived. Editor 23, Storage 43, Worker
46, Web 59 and dependency-patch 14 tests pass. Global format remains red on 41
inherited files; full audit remains red on 1 high/10 moderate vulnerabilities.
Draft PR #40 targets PR #39's branch. Full E2E and GraphQL final evidence remain
pending; publication is not acceptance or permission to merge.

## First full combined E2E result — red, investigation required

First run: 467 PASS / 25 FAIL / 0 skipped of 492 tests, 47 suites, 425.3s.
All ten migrated Achievements/Custom Titles cases pass. Failures are inherited
News null/zero mismatch, one app GraphQL registration timeout at unchanged
5000ms, and Reputation write suite initialization failure opening schema.gql
(UNKNOWN file-system error). No assertion or timeout was weakened. Concurrent
quality processes existed during this run; that correlation is not proof of
the file error's cause. Do not call the additional failures inherited or solved.

Complete first JSON/log remain preserved in ignored d4-reconcile-full-e2e
artifacts. After zero DB clients and zero api_boundary schemas were verified,
only completed run PID 4064 was stopped for retained handles (shell exit 1).
schema.gql has no tracked diff. GraphQL generation succeeds but check reproduces
only DEBT-044 generated-barrel comment/newline drift; its own side effect is
restored. Further serial E2E verification is required, preserving this first
failure evidence. No automatic retry was started merely for observation timeout.

Serial follow-up is running with a fresh database and distinct serial-e2e
artifacts, with no other quality gate process started alongside it. Read-only
process inventory finds only that Jest PID 3636. Source tracing confirms every
AppModule initialization writes the same process.cwd()/src/schema.gql path.
The first unit run ended at 21:01:13Z, while Reputation initialization failed
at 21:02:58Z: direct overlap with unit coverage does not explain that failure.
Concurrent processes are not established as the cause; no runtime/test-harness
fix is authorized or implemented based on this suspicion. Preserve both reports.
