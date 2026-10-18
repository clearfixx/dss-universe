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

First nine-case run passes 9/9, 14.576s, normal exit. Expanded DB suite passes
10/10, 16.585s, normal exit; root lint passes 9 tasks (44.444s).
Other root gates still running. Expected P2002 diagnostic log remains visible.
Full opt-in coverage, adjacent gates, serial full E2E, GraphQL, CI/review/owner
acceptance are required; debt remains open. Known baseline failures must not be
waived or hidden through repeated runs, timeout increases or schema changes.
