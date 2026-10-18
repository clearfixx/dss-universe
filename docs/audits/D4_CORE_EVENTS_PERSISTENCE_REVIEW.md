# D4 — Core Events/Audit/dispatcher persistence review (partial)

Date: 2026-10-19. Baseline `8f208f0` / draft PR #40, unaccepted.
Branch `debt/d4-core-event-persistence-review`. No runtime changes.

Complete reads: OutboxWriter, envelope factory/types/JSON contract, Events module
and index, AuditWriter/Redaction/entry contract/module/index, dispatcher, runner,
QueueRegistry/QueueOperations/Queue module, initial Outbox/Audit migrations,
current schema blocks and existing outbox E2E. All-producer payload/retention and
complete Worker/transport reconciliation are not certified by this packet.

| Operation           | Ownership and limits                                                                                                                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| envelope factory    | Requires nonblank name/producer and positive integer version; generates UUID/timestamp unless supplied. Caller-supplied string time, payload/category/metadata are not runtime schema validation here.                    |
| Outbox append       | Core-owned row in supplied transaction, explicit event fields, same event ID, no independent commit; payload/metadata persisted without Audit redaction.                                                                  |
| Audit append        | Core-owned row in supplied transaction; explicit actor/target/context, SUCCESS default; redacts metadata keys recursively, not reason/IP/userAgent or arbitrary string values.                                            |
| redaction           | Arrays/objects traversed; sensitive key regex replaces value. Not a universal secret scanner or producer-payload validator.                                                                                               |
| dispatch candidates | Due PENDING, createdAt ASC, limit default 50; no ID tie-break; snapshot may become stale before CAS.                                                                                                                      |
| claim               | updateMany ID/PENDING → PROCESSING with timestamp/PID; loser skipped. PID alone is not a unique attempt identity.                                                                                                         |
| enqueue             | Stable event-ID jobId, full mapped event context, 5 exponential retries/1000ms, completed/failed jobs retained. Queue call and database updates are not one transaction.                                                  |
| success/failure     | Unconditional ID update → PUBLISHED or PENDING with attempt/backoff/raw error; no claim fencing. PUBLISHED means queued, not downstream effects complete. DEBT-065 confirmed below.                                       |
| stale recovery      | Default 60000ms age, PROCESSING lockedAt older than cutoff → PENDING; clears locks, increments attempts, records fixed error. No uniqueness token carried into completion.                                                |
| runner              | Optional positive interval; immediate cycle then unref timer; recovers then dispatches, logs cycle errors, clears timer on shutdown. In-flight cycles are not cancelled or single-flight guarded.                         |
| registry            | Core-owned BullMQ queues, waits ready, closes each on shutdown. No consumer domain authority is granted by registry export.                                                                                               |
| queue operations    | Counts/failed job inspection; retry failed queue job then marks matching unresolved dead letters resolved. These are separate operations, not atomic delivery completion. Transport/privacy scope still requires tracing. |

Schema/migration reconciliation: Outbox primary ID is UUID in initial SQL but
String without native annotation in Prisma (existing drift, not changed here).
Status/due and aggregate/correlation indexes exist. FAILED enum is not a
dispatcher outcome in the inspected algorithm. Audit initial migration has
indexes but no immutable-record trigger; the writer is append-only, which is not
proof of universal database immutability. No constraints or history protections
were bypassed for the new fixtures.

Core Events/Audit indexes still expose wildcard entries and concrete writers;
shared technical persistence is not a feature business port. D4.4 must reconcile
named infrastructure surfaces without allowing foreign feature repositories or
Prisma through business contracts. Existing misleading Events README describes
dispatch as future Phase 4 work; runtime dispatcher already exists. D5/docs
reconciliation remains required, not a stack replacement.

## Actual migrated evidence

`core-outbox-audit.e2e-spec.ts`: 4/4 PASS, 7.238s, normal exit 0. Actual fully
migrated PostgreSQL, real dispatcher/writers; only queue boundary doubled.

- Two concurrent calls yield one CAS winner/queue call and one PUBLISHED row;
  later dispatch skips it. This is a tested schedule, not every possible race.
- Actual primary permission and redacted Audit/Outbox commit together. Real
  duplicate Outbox ID failure rolls primary/Audit back, leaving original event.
  Synthetic sensitive metadata keys are redacted recursively.
- Old attempt pauses inside queue boundary after real PROCESSING claim. Fixture
  ages only that owned lockedAt by 61000ms; default recovery restores PENDING.
  Second actual dispatch publishes; old queue failure then reopens PENDING with
  publishedAt still nonnull and attempts=2. No fake successful DB results.

This confirms **DEBT-065**, a stale-attempt state regression. No live BullMQ,
downstream event loss, duplicate domain effect or exposed secret is proven.
Stable queue job IDs and consumer idempotency must be preserved in any correction.
Separate claim-fenced completion/failure correction requested; audit makes no fix.
Owner subsequently approved that separate package on 2026-10-19. Exact claim
identity and fencing design remain the correction packet's work.
Subsequently approved design: lockedBy carries PID+UUID unique attempt token;
success/failure CAS checks ID/PROCESSING/token; recovery clears token. No new
schema or queue payload/jobId/retry/default recovery/API change. Old queue.add
is not cancelled and exactly-once is not promised. Runtime remains unchanged here.

Initial new test assertions incorrectly presumed empty Audit history after
migrations; scoped to own synthetic action instead, without deleting migration
evidence. Expected real P2002 is logged, not suppressed. Full quality gates,
serial full E2E, GraphQL, publication/CI/review and owner acceptance remain pending.

Current gate checkpoint: API opt-in coverage 1101/1101 across 148 suites,
zero skips, 80.183s; root lint/typecheck 9 tasks each pass; build passes 6 tasks,
51.756s. Remaining gates are
running; do not reuse previous packet build/E2E evidence as current acceptance.

Follow-up: Prisma validation and bounded architecture checks pass; frozen
inventory remains 84 known findings, not waived. Fresh adjacent tests pass:
Editor 23, Storage 43, Worker 46, Web 59, dependency patches 14. Root format/audit
sequence is still running. Full E2E waits for its terminal result to keep this
verification serial; no test is restarted because polling yields no output.

For the approved separate DEBT-065 correction, regression scope must include
old success AND failure after recovery, both while the successor is PROCESSING
and after it becomes PUBLISHED, normal failure/backoff and stable jobId, single
CAS winner, and actual default stale recovery. Claim fencing protects database
ownership, not cancellation of an already-started queue call. No such correction
is implemented or credited by these characterization tests.

Root gate sequence has completed (exit 1 from inherited dependency audit): global
format 41 files and full audit 1 high/10 moderate remain red. All other inspected
gates above pass within their stated scope. Full E2E now runs alone on recreated
verified project/service/tmpfs loopback 5435 after zero clients and empty public
schema checks, then migrations without seed; development DB 5433 is untouched.
GraphQL and final E2E evidence remain pending. Draft PR #41 is not accepted.

## Producer discovery and selected payload trace

Read-only search finds 18 non-test API files mentioning envelope creation/Outbox
append, including the factory itself: 17 candidate producer call-site files.
Separate direct-create search finds the owned OutboxWriter delegate. These
lexical results do not prove absence of aliases, raw SQL, delegated producers
or calls outside API; no all-producer coverage certificate is inferred.

Complete contextual reads of root Profile Wall and News draft transactions and
News workflow repository show these explicit payloads:

| Source                             | Persisted event payload and limit                                                                                                                                                                                                                                                                                        |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| root Profile Wall create/tombstone | profileOwnerId and create hasImage; author/actor and post identity in envelope. Body and media key/path are not in these payloads. Deletion reason is retained separately in Audit/target evidence.                                                                                                                      |
| root News draft create/save        | article/author/revision/version/status, create postType/language/slug and save previousVersion. Document, short/full text and attachment binary are not in these payloads. Draft slug still requires appropriate internal retention/access policy.                                                                       |
| News editorial workflow            | Domain event includes IDs, status/action/version/decision, reason/times, title/slug/language/visibility/indexing/category/tags. Notification event includes article/author/recipient or reviewer audience, status/action/title/slug/language. Not just an opaque ID; unpublished metadata can remain in internal Outbox. |

All three append inside the same caller transaction as their owner writes.
These source reads do not prove every rollback, producer minimization policy,
external delivery authorization or operator retention requirement. No public
metadata leak or secret exposure is established from internal persistence alone.
Remaining candidate producer fields and Worker/transport consumers still need
operation-level reconciliation; raw dispatcher error retention also remains open.
