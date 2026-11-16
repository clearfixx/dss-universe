# DEBT-067 — Durable Activity retraction

Status: implemented candidate; full gate, CI and package review pending.
Base: accepted main790f098 plus the approved finite Phase A reconciliation.

The Wall projector used to UPDATE existing entries only. A retraction arriving
before creation disappeared; subsequent creation produced an active feed row.
The correction stores minimal projection-owned evidence in
`activity_retractions`, keyed by subject type/ID with the earliest known UTC
retraction time. No post body, producer-table lookup or foreign aggregate read
is introduced.

Both Wall operations acquire the same source-scoped PostgreSQL transaction lock.
The lock statement precedes the data statement, so the normal Read Committed
snapshot observes an earlier winner's commit. Creation copies any retraction
timestamp into the new entry. Retraction atomically upserts evidence and marks
existing entries. Failure rolls back both effects; failed rollback discards the
connection without masking the original error. News projection is unchanged.
Existing Activity reads already require `retractedAt = null`, so no read/API
contract or frontend change is needed. Marker-after-handler semantics and
at-least-once delivery remain unchanged.

Migration20261115170000 adds one table and backfills existing Wall retractions.
It does not reconstruct historically lost events. Deploy by draining/stopping
old projection workers, applying the migration, then starting updated workers;
old workers do not participate in the new serialization protocol. Do not drop
the evidence table during rollback; an old-worker rollback loses the guarantee.
No developer/production database or services are changed by local verification.

Regression coverage extends the existing real Worker process/migrated-schema
boundary tests: both sequential orders, exact replay and distinct create event
replay, independent sources, both physically observed lock winners, atomic
failure rollback/retry and migration backfill. Tests retain actual processor
markers and no sleeps, retries or increased deadlines. Worker unit tests cover
transaction/resource handling and unchanged metadata allowlists.

Preparation against disposable loopback5434 passed Prisma validation/generation,
normal migration deploy and zero schema drift. An initial new backfill test
read a timestamp-without-time-zone using pg's local timezone conversion; its
assertion was corrected to select an explicit UTC instant. The failure is
retained in the focused log; no production timestamp logic was changed to make
that assertion pass. Final focused verification passed Worker55/55, Worker
typecheck/lint and migrated DB/actual-Worker16/16. Full gate and CI remain pending.

Local verification helper: `tools/agent-helpers/activity/run-debt067-verification.ps1`.
It reads disposable credentials from local configuration without printing them,
uses existing pinned tools and never resets data or provisions services.

No automatic gamification, owner-role implementation, historical Activity replay
or event-platform redesign belongs to this correction.
