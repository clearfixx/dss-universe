# DEBT-067 — Durable Activity retraction

Status: runtime verified; publication/merge tracked in PR163. Not final D7 closure.
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
typecheck/lint and migrated DB/actual-Worker16/16 before the full acceptance run below.

Acceptance evidence2026-11-16: runtime/helper head `c90443f33625d9c5ca19094d6025c4233613e446`
passed exact local quality:full, exit0, 06:30:04–06:50:43 UTC. API1547/1547,
E2E888/888 across78 suites with zero pending/todo, coverage5/5 executable
workspaces, build6/6 and fresh Web15/15 without retries. System Kernel-Power42/107
query succeeded with zero events in that exact interval. CI8/8 on the same head
also passed; actual logs confirm API1547, E2E888, build6, Web15 and native48 on
Windows/Linux/macOS. Main job133131816293, Web133131816294;
workflow runs43817148159/43817148119/43817148154.

The initial full attempt stopped at native build because PYTHON was not supplied;
the next stopped on formatting a generated receipt in the wrong helper subfolder.
Both are local verification-preparation failures, not Activity runtime defects.
Existing Python3.12.14 was selected without installation or host changes; helper
receipts now use the established ignored root location. Raw failed attempts are
preserved in `tools/agent-helpers/debt067-preflight-failures-02d82a290fb745fb976d1c8623d4f044.local.zip`,
SHA256 `17A25014C24BA7EF222D32598950E969C5114087A382B803DDEFBE4C88246FD0`.
The successful receipt is `tools/agent-helpers/debt067-full-881f856ccea3490aa54c14cde936ec61.local.json`;
full reports are in `node_modules/.cache/quality-full-ZznDte/`.
Final report updates change documentation only; they do not claim a second local
full run on the documentation commit. Final-head CI remains a publication check.

Local verification helper: `tools/agent-helpers/activity/run-debt067-verification.ps1`.
It reads disposable credentials from local configuration without printing them,
uses existing pinned tools and never resets data or provisions services.

No automatic gamification, owner-role implementation, historical Activity replay
or event-platform redesign belongs to this correction.
