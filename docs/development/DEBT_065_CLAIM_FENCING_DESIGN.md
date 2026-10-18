# DEBT-065 — Outbox dispatcher claim fencing

Date: 2026-10-19. Branch `debt/outbox-claim-fencing`.
Baseline `cd8dddf` / draft audit PR #41. Owner approved scope and design.
Implementation is local; full verification, publication and acceptance pending.

## Contract and implementation

Every successful PENDING→PROCESSING claim writes a new PID-prefixed UUID to
existing lockedBy. lockedAt remains the recovery timestamp; no migration.
Normal success and failure are updateMany CAS operations requiring the same
event ID, PROCESSING status and exact attempt token. Success counts only the
actually transitioned row; lost owners return zero without mutating newer state.
Recovery keeps its original default 60000ms cutoff and clears ownership, so old
success/failure cannot publish, reopen, increment attempts or clear a successor.

Queue name, job ID, payload, retry/backoff/retention options and public API stay
unchanged. Queue.add and database updates remain separate operations. A stale
queue call may still complete; this does not cancel it or promise exactly-once
domain effects. Existing queue deduplication and consumer idempotency still
matter. No new transaction, timeout, table, permission, frontend or event is added.

Source search across API/Worker/packages finds no other runtime consumers of
lockedBy/lockedAt beyond dispatcher. PID prefix retains operator context while
UUID avoids PID/timestamp reuse as attempt identity. This token is coordination
data, not an authorization credential or new payload field.

Operational limit: fencing assumes completing dispatcher processes run this
updated code. An old binary's unconditional update cannot be fenced merely by
new application predicates; deployment must drain/stop old dispatcher instances
before claiming this protection across all instances. No deployment or service
shutdown is performed in this local package. Existing stale PID-only claims
can still be recovered by the unchanged timestamp predicate.

## Actual DB regression scope

The former undesired-state diagnostic becomes six real migrated schedules:
old success/failure versus PENDING after recovery, successor PROCESSING and
successor PUBLISHED. Controlled queue barriers release only after actual state
is observed; whole persisted row, including timestamps/error/attempts, must be
unchanged by old completion. PROCESSING successor carries a different token
and subsequently publishes normally. Default recovery uses an aged owned fixture
timestamp, not increased production/test deadlines or fake successful DB results.

Retained tests cover one pending CAS winner, actual primary/Audit/Outbox commit
and uniqueness rollback. Added normal queue-failure case checks bounded 1000ms
retry scheduling, error/attempt fields, then fixture due-time advancement and
successful retry with identical event/job identity and unchanged queue options.
Queue boundary is doubled; no live BullMQ or downstream exactly-once claim.

Additional publication-storage failure regression throws at the PUBLISHED
database boundary after queue.add returns, without fabricating a successful DB
write. Current owner schedules retry; due fixture then publishes with the same
job ID. Final migrated suite passes 11/11, 32.445s, normal exit. Six stale-owner
cases plus normal queue/storage failure, claim and atomic evidence are retained.

First nine-case run passes 9/9, 14.576s, normal exit. Expanded DB suite passes
10/10, 16.585s, normal exit; root lint passes 9 tasks (44.444s).
Other root gates still running. Expected P2002 diagnostic log remains visible.
Full opt-in coverage, adjacent gates, serial full E2E, GraphQL, CI/review/owner
acceptance are required; debt remains open. Known baseline failures must not be
waived or hidden through repeated runs, timeout increases or schema changes.

Current full API opt-in coverage passes 1101/1101, 148 suites, zero skips,
81.077s. Production build passes 6 tasks (30.279s); initial root types/lint pass.
Prisma/architecture pass their bounded scope and baseline remains 84 known
findings. Global format 41 inherited files and audit 1 high/10 moderate remain
red. Final lint/typecheck after the additional test and adjacent package gates
are running; full E2E/GraphQL have not yet been run for this correction.

Final pre-E2E follow-up: root lint/typecheck after the eleventh test pass 9 tasks
each (40.519s/18.312s); Editor 23, Storage 43, Worker 46, Web 59 and patches 14
pass. Other gate processes are terminal. Full E2E now runs separately against
verified recreated disposable tmpfs loopback 5435 after zero clients/empty public
schema checks and migrations, without seed; dev DB untouched. GraphQL remains
pending until E2E completes. Draft PR #42 targets audit PR #41; no merge or full
acceptance is claimed.

Final serial full E2E: 501 PASS / 2 FAIL / 0 skipped of 503, 48 suites,
434.610s. All eleven Core Outbox regressions pass in this full run. Failures are
the recurring app registration/GraphQL 5000ms timeout and News foundation
viewCount null-versus-zero mismatch (DEBT-045); no timeout/assertion changes or
rerun-to-green. Completed Jest retained handles; only verified Jest PID 8648 was
stopped after the complete JSON and zero active DB clients/fixture schemas.
This is not a normal green process exit. GraphQL generation succeeds but its
check remains red for known DEBT-044 generated barrel drift. Only that generated
comment/newline side effect was restored; schema and generated outputs have no
remaining diff. Full acceptance remains pending CI, review and owner approval.
