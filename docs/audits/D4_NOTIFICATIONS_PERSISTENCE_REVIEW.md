# D4 — Notifications persistence review (partial)

Date: 2026-10-18. Baseline `c0ea01e`, draft Media audit PR #34; acceptance open.
Branch `debt/d4-notifications-persistence-review`. No runtime changes.

Complete reads: notification preferences repository, service and unit suite,
domain preferences types, GraphQL resolver/input/model, module assembly;
UserNotificationPreferences schema block. This is operation evidence, not proof
of a complete notification delivery platform.

| Operation              | Facts, authority and consistency                                                                                                                                                                                                                                                                                     |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| findByUserId           | Owned preferences row by unique userId; no explicit foreign User select. Missing returns null; database failures propagate.                                                                                                                                                                                          |
| upsert                 | Owned row create/update plus Core Audit in one transaction. Audit action notification.preferences.updated, actor/target equal userId, metadata preferences. FK references physical User; no credentials/profile projection. Concurrent updates are last-writer replacement, not a documented merge/version contract. |
| get                    | Returns persisted row or in-memory defaults; no default row write. Default arrays are copied per call. Defaults match schema categories/email/digest OFF.                                                                                                                                                            |
| update                 | Full replacement input; filters categories through canonical order with Set deduplication. No independent permission decision: caller must supply authenticated owner ID.                                                                                                                                            |
| GraphQL query/mutation | Both JwtAuthGuard; userId only from AuthUser, not a client argument. Model exposes four preferences fields, not userId/timestamps or arbitrary row data. Input enumerates categories/digest and boolean, unique arrays.                                                                                              |
| assembly               | Exports concrete NotificationPreferencesService; this is an existing broad public surface for D4.4 reconciliation, not permission to add foreign consumers.                                                                                                                                                          |

Search of API source and Worker for the concrete service, Prisma delegate and
physical table found only own module/resolver/repository and own tests. Together
with module purpose (“policy foundation”), this establishes no discovered
production delivery consumer of these preferences in those sources. It is not
a universal negative proof across dynamic code or future modules. Mandatory
Auth security email jobs are separate from optional community categories; do not
silently suppress them based on emailEnabled.

Unit suite passes 2/2, 0.725s: absent-row defaults and canonical ordering. Mocks
do not prove migrated Audit rollback, concurrent upserts, HTTP/GraphQL guard
integration or actual delivery/digest scheduling. Those remain verification work.
No new functional defect is declared merely because a foundation is incomplete.
Existing plan/phase acceptance must be reconciled before claiming delivery done.

The input file also owns enum registration and model imports those enums from
the input path. This is a source-surface/style observation for D4.4, not an
implemented cleanup or an authorization bypass. Full current matrix, gates and
publication for this tranche remain pending. User stack audit plan untouched.

## Plan and integration reconciliation

Read Phase 9 Comment Mentions foundation and Phase 10 completion audit completely,
and Phase 15 Notifications/Email/Realtime/DoD roadmap sections. They explicitly
defer inbox, unread, preferences-aware delivery, digest/email and realtime to
Phase 15. Routing events are requests, not delivered notifications. Therefore
the absent delivery consumer is expected future scope, not a new pre-Phase-11
defect by itself. This does not certify Phase 15 implemented.

Existing `app.e2e-spec.ts` case “reads defaults and updates owner notification
preferences” was read and run separately against disposable DB 5435. It registers
a user via GraphQL, authenticates query/mutation, asserts exact defaults and
canonical updated categories, email disabled/digest WEEKLY, then checks one
matching Audit record for that user. Targeted command exits zero normally;
this is not a full E2E rerun. It does not test guest rejection, foreign-owner
attempt, invalid enum/input, Audit rollback or concurrent replacement, so those
requirements remain unproved by this case.

## Migrated persistence regression

New `notification-preferences-atomicity.e2e-spec.ts` passes 2/2, 4.199s, normal
exit. Actual service/repository/Audit writer and fully migrated private schema;
only an Audit exception is injected. Default reads leave no preferences row.
Failed initial insert leaves neither preferences nor matching Audit; failed
replacement preserves the exact prior row (including timestamps) and one Audit.
A subsequent successful replacement changes the value and yields exactly two
Audit records. No history trigger is disabled, no dev DB reset and no successful
DB result mock. HTTP and delivery coverage remain separate. Full packet gates
and publication remain pending.

Current packet API coverage passed 1101/1101 tests, 148 suites, zero skipped,
62.654s, with all four DB/Redis opt-in suites enabled and existing thresholds
retained. Root lint/typecheck pass. Full API E2E has been started separately
against verified loopback 5435 tmpfs database after zero-client check,
recreation, empty-table verification and fresh migrations; no seed or dev DB
reset. Do not substitute the prior targeted run for its pending full result.

Full E2E subsequently completed JSON: 481 PASS / 1 FAIL of 482 tests, zero
skipped, 357.813s. Both new atomicity cases pass; sole failure remains inherited
News viewCount null-versus-zero (DEBT-045, line 478). Jest reports retained
handles, so normal process completion is not certified. Session 34069 remains
live at the inspected checkpoint; no restart or blanket process kill occurred.

Remaining adjacent package commands were not executed: automatic escalation
review failed due to its usage limit, not a finding that the commands are unsafe.
Do not bypass review or claim those gates passed. Exact owned-process/DB cleanup,
remaining gates, commit/push/PR publication are pending restored approval service
or user direction. This is not acceptance or closure. Owner separately approved
DEBT-063 correction after audit; it remains outside this Notifications packet.

Approval service later recovered. Exact own retained Jest PID 8628 was verified
by its unique report argument and stopped after zero DB clients/fixture schemas;
session exited 1, not normal green. Previously blocked adjacent gates were then
executed: Editor 23, Storage 43 coverage, Worker 36 coverage, Web 59 coverage
(maxWorkers=2), dependency patches 14 PASS. Prisma/build/architecture PASS,
baseline 84 unchanged. Global format remains 41 inherited files; audit remains
one high/ten moderate. GraphQL check reproduces DEBT-044 generated-barrel-only
comment/newline drift; its side effect restored, schema/operations unchanged.
This supersedes the temporary execution blocker above, not the inherited gate
failures. CI/review/owner acceptance remains open.
