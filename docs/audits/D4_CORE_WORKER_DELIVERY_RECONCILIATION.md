# D4 — Current Core / Worker delivery reconciliation

Date: 2026-10-21. Base: `194e73bdc2c4f3d8abb7bb43f92caeedb5aff0f0` / draft PR71.
Branch: `audit/d4-core-worker-delivery-reconciliation`. Source/test evidence,
not D4 acceptance, a new consumer policy or a runtime correction.

## Current baseline and bounded reads

Current tracked non-test TypeScript under `apps/api/src` and `apps/worker/src`
contains840 files. Sorted project-relative path + newline + raw bytes + newline
SHA256: `fa5787bd5d25135463eaf72f5bf62fc07170243788124e898bed3bda4e8efa3a`.
Declarations and spec/test/e2e-spec sources are excluded. This identifies the
runtime being examined; it is not a claim all840 files were freshly reviewed.
There is no production API/Worker/shared-jobs source diff in this packet.

Complete source reads in this tranche: ten Core files (Outbox writer, envelope
factory/type/Events index, Audit writer/redaction, queue registry/operations,
dispatcher/runner); five Worker route files (main, integration processor,
processed-event store, Activity projector, DeadLetterService); Worker environment
and Media processor for composition context; shared jobs source index. Eighteen
sources, not all fourteen Worker files or every producer/transport consumer.
Auth delivery, Media SQL/files/scanner and all-producer retention still retain
their own earlier reports and acceptance limits, not a new universal certificate.

Exact complete-read source set (context-only scope for environment/Media as above):

```text
apps/api/src/core/events/services/outbox-writer.service.ts
apps/api/src/core/events/factories/event-envelope.factory.ts
apps/api/src/core/events/types/event-envelope.type.ts
apps/api/src/core/events/index.ts
apps/api/src/core/audit/services/audit-writer.service.ts
apps/api/src/core/audit/services/audit-redaction.service.ts
apps/api/src/core/queue/services/outbox-dispatcher.service.ts
apps/api/src/core/queue/services/outbox-dispatcher-runner.service.ts
apps/api/src/core/queue/services/queue-registry.service.ts
apps/api/src/core/queue/services/queue-operations.service.ts
apps/worker/src/main.ts
apps/worker/src/integration-event.processor.ts
apps/worker/src/processed-event.store.ts
apps/worker/src/postgres-activity.projector.ts
apps/worker/src/dead-letter.service.ts
apps/worker/src/environment.ts
apps/worker/src/media-processing.processor.ts
packages/jobs/src/index.ts
```

Sorted exact-path/newline/bytes/newline SHA256 for these18 sources:
`fdd938c370e56ed409438a335d6837d25c22e2502095a08ace86d06b08516a8d`.

## Source-level operation disposition

| Component                     | Current owner boundary / schedule                                                                                              | Evidence limit                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Core envelope / Outbox writer | Explicit named Events entry; supplied transaction persists caller payload/metadata and stable event ID                         | Not a runtime schema validator or redactor; a synthetic producer is not a real News publish workflow   |
| Audit writer / redaction      | Same supplied transaction; recursive sensitive-key metadata redaction                                                          | Free-text reason/IP/userAgent and arbitrary string contents are not universally scrubbed               |
| Dispatcher                    | Due PENDING lookup; CAS claim with PID+UUID; stable jobId; enqueue then completion/failure CAS on ID/PROCESSING/token          | DB and queue are separate; PUBLISHED means accepted by queue boundary, not handled downstream          |
| Stale recovery                | Clears token and restores PENDING at existing60000ms default                                                                   | Old queue.add is not cancelled; claim fencing protects DB ownership only                               |
| Runner / registry             | Existing immediate/unref interval; recovery before dispatch; queue startup/shutdown owned by Core                              | No new single-flight, cancellation or retry policy; this fixture does not start timers or Redis        |
| Queue operations              | Failed raw jobs inspection; queue retry followed by DLQ resolvedAt update                                                      | Separate effects, not atomic delivery completion or a demonstrated public inspection endpoint          |
| Worker main                   | Actual integration handler is Activity; Auth and Media have distinct processors                                                | main is source-read, not started by the fixture; production gamification wiring remains DEBT007        |
| Integration processor         | Validates shared job, hasProcessed → handler → markProcessed                                                                   | No generic handler/marker transaction or exactly-once promise                                          |
| Processed store               | Own coordination table, conflict-safe event/consumer unique marker                                                             | Duplicate handling depends on handler-owned idempotency if commit precedes marker                      |
| Activity projector            | Only activity_entries; Wall create/retract and News published; sourceEventId conflict protection and fixed metadata projection | No producer table authority; projection presence/visibility is not current viewer/source authorization |
| DLQ service                   | Full event/reason in dead_letter_events before retained DLQ queue call                                                         | DB/queue effects separate; full internal payload is not Audit-redacted or public-safe by default       |
| Environment / Media context   | Validate before connections; Media FAILED CAS remains the separately approved DEBT063 boundary                                 | No new global lease, mail/scan delivery or IO/provider certification                                   |

The [older Core review](D4_CORE_EVENTS_PERSISTENCE_REVIEW.md) describes its
pre-DEBT065 unfenced dispatcher and historical wildcard Events surface. Current
source has the approved PID+UUID/CAS correction and explicit named Events
exports. Do not treat its old vulnerable-state rows as today's implementation.
The [older Worker inventory](D4_WORKER_SOURCE_BOUNDARIES.md) likewise retains its
named source base; this tranche does not silently refresh every Worker file.

Consumer identities deliberately remain unchanged: main's two-argument factory
call uses default `dss.worker.integration-events.v1`, while configured DLQ uses
`dss.worker.integration-events.v2`. DEBT061 needs a separate historical-marker/
replay decision. New tests reproduce the current identities; they do not approve
the mismatch or silently rename either one.

## Actual migrated persistence bridge

[New E2E](../../apps/api/test/core-worker-delivery-boundary.e2e-spec.ts) uses a
fresh fully migrated owned schema per case, real OutboxWriter/dispatcher and
captured queue mapping. [Native ESM bridge](../../apps/api/test/helpers/integration-worker-probe.mjs)
loads actual Worker source with the installed tsx loader, actual shared jobs
processor and real PostgreSQL stores/projector. Schema/loopback test identity are
validated; configuration and synthetic payload arrive on stdin, not arguments.
Pools close before the parent drops only its generated schema. No production
immutability trigger is disabled and no dev database is reset/migrated.

| Case                            | Actual required observation                                                                                                                                                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Wall create                     | Exact durable envelope-to-job mapping/options; one MEMBERS Activity row, only profileOwnerId/hasImage metadata, one v1 marker                                                                                                  |
| PUBLIC / MEMBERS News           | Two cases preserve visibility and the five supported metadata fields, excluding injected synthetic body                                                                                                                        |
| Marker failure / replay         | Real owned BEFORE INSERT trigger rejects processed marker after Activity INSERT commits; first attempt fails with row present/marker absent; retry preserves the identical row and writes marker; later delivery skips handler |
| Concurrent duplicate deliveries | Both calls complete with one Activity row and one marker; does not assert every interleaving or that both handlers necessarily ran                                                                                             |
| Unrelated private Bookmark      | Real processor acknowledges/marks event, Activity remains empty; does not claim a production gamification effect                                                                                                               |
| Ordered Wall retract            | Real retraction updates existing row, repeated event is duplicate and preserves row; not a fix/proof for retraction-before-create DEBT067                                                                                      |
| Invalid News + DLQ              | Missing supported metadata rejects projection and leaves no marker; explicit test invocation of actual DLQ service persists full envelope/reason under configured v2 then records queue call                                   |

This is eight executed cases, not eight new product features. Injected synthetic
body/hash values are defensive projector allowlist probes, **not** evidence that
a supported production producer emits credentials. Internal Outbox and DLQ retain
the supplied payload; no universal secret-free or operational-retention policy
is inferred. News metadata projection is not server-side content-gate redaction.

Queue add is captured, not live Redis delivery. DLQ.record is explicitly invoked
after a fixture failure; production BullMQ exhausted-retry callback, process
shutdown, SMTP, antivirus, physical storage and live operator transport are not
exercised. Default v1 is actual factory behavior; v2 is the current explicit DLQ
configuration. No main.ts import/side effects, queue rename or policy correction.

## Verification and remaining D4 disposition

First harness attempt fails7/7 before Worker execution: Windows ESM --import
requires a file URL, not a drive-letter path. The test now uses pathToFileURL;
production code/timeouts are unchanged. Corrected first tranche passes7/7 in
14.183s. Expanded final focused8/8, zero skipped,15.698s, normal exit0. Failed
harness and passing reports remain separate under local
`node_modules/.cache/d4-worker-boundary-*`; an import failure is not runtime
red-before/green-after correction evidence.

Initial full typecheck also rejects the test helper's inferred UUID-template
default parameter when passing the shared contract's ordinary string. An explicit
`aggregateId: string` annotation corrects that test-only typing; final root
typecheck and scoped lint pass. No assertion or timeout is relaxed.

Full API opt-in coverage1225/1225,163 suites,0 skipped,51.963s, normal exit0.
Lint/types/Prisma/build/architecture140 pass; adjacent Editor23/Storage43/Worker46/
Web59/patch14 pass. Global format remains41 inherited files; dependency audit
reports0 critical /2 high /12 moderate. GraphQL generation succeeds but consistency
exits1 on DEBT044's generated barrel comment. Only that verification effect is
restored with an exact-content guard; SDL hash before full E2E remains
`C03170CB54027C557F662A5B9BF5F85CAFA2112B8623D3FCA360E8FA9C82FD2C`.

First complete full E2E executes586 cases:584 PASS/2 FAIL,53 suites,0 skipped,
20836.151s. New bridge8/8 and Core Outbox11/11 pass. Failures are inherited News
null/zero/retirement cleanup and a60000ms setup-hook timeout in unchanged
leaderboard-ownership, followed by its double-close cleanup error. Windows
Power-Troubleshooter event1 records sleep10:30:29.3783311Z to wake16:08:51.0652201Z;
the test report spans10:30:20.897Z–16:17:37.050Z. Sleep overlaps the slow hook,
but this temporal evidence does not establish every timeout/cleanup cause.
No power setting, host configuration or test timeout is changed.

After the complete JSON, zero other DB clients are verified; only exact completed
own Jest30676 is stopped for retained handles, original shell exit1. One generated
owned schema remains from setup. Only the verified loopback5435/tmpfs/project/
service disposable container is recreated (removing its synthetic data/schema),
then all migrations applied without seed; dev5433 is untouched. A separate fresh
serial full retry keeps the first report intact, rather than replacing it or
calling a diagnostic restart green acceptance.

Parent draft PR71 at194e73b has terminal CI: main quality CANCELLED, Web smoke
and dependency audit FAILURE, Linux/Windows storage containment SUCCESS. This is
a bounded parent snapshot, not current packet CI or a green baseline.

Fresh serial full retry:585 PASS/1 FAIL of586,53 suites,0 skipped,712.474s.
Report spans17:02:34.212Z–17:14:26.692Z. New bridge8/8 and Core Outbox11/11 pass;
only inherited News null/zero/retirement cleanup fails. Leaderboards setup timeout
does not repeat, without establishing its cause or a general stability guarantee.
After complete JSON and zero other DB clients/owned schemas, only exact completed
own Jest22600 is stopped for retained handles. Original shell exits1, not normal
green termination, a forceExit change or a bypassed assertion.

Final schema/operation output diff is empty; all7 packet files pass scoped
format/diff checks, both new Passports/named imports pass, and30 local document
links resolve. Runtime840-source fingerprint is unchanged. No source file is
deleted. Owner's untracked stack audit plan is unchanged/excluded at SHA256
`B1D657CFCEA43DF16636E9C79F4BB62BF4F94848B31780234C2364CBA557796A`.
Current packet CI/independent review/owner acceptance remain pending. No inherited
red gate is waived. This supplies actual marker-gap/replay
and projection persistence evidence for the selected route, not all-producer
lifecycle, all fourteen Worker files, every current root/owner fragment, or
seventeen-family disposition/CI/independent review acceptance. D4 remains open.

Next bounded D4 step is current-state/delta reconciliation of the existing
seventeen-family evidence map and root owner contracts, not arbitrary new module
audits merely because an earlier report is old. Preserve already verified
ownership transfers, link changed paths to their separate correction evidence,
and identify exact unproved required claims. Optional unexercised concurrency
schedules are not automatically defects or authority for extra runtime changes.
Keep source-level completion distinct from inherited red-gate/release acceptance.

Owner checkpoint2026-10-21: stop after actual D4 completion and report; do not
start D5/D6/D7, stack audit or Phase11 without a new command. The owner's untracked
stack audit plan is not part of this packet.
