# D4 — Worker source-boundary inventory

Date: 2026-10-16. Source baseline `17ad445` / draft PR #28 (unaccepted).
Scope: all fourteen non-test `apps/worker/src/*.ts` files, shared jobs contracts,
Auth queue producer allowlists and Core Outbox/queue plumbing. Source review,
not a live SMTP/ClamAV/Redis delivery certification or full API SQL acceptance.

Sorted basename + newline + UTF-8 source + newline SHA-256:
`9fae89854b49ed2014aa2ece42a7fd59d07f7a7410cf43e5b0a46503a2a10662`.
Worker source unchanged since `e57c683`; no runtime correction in this review.

| Source                             | Ownership/effects                              | Evidence and retained limits                                                                                                             |
| ---------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| main.ts                            | Worker assembly, Redis/PG/SMTP/queue lifecycle | no feature table SQL; consumer identity mismatch DEBT-061                                                                                |
| environment.ts                     | startup configuration                          | required PG URL/ports/mail URLs; no values logged; not a proof of every possible config policy                                           |
| integration-event.processor.ts     | durable-consumer orchestration                 | delegates validation/dedup/handler/marker; default consumer v1                                                                           |
| processed-event.store.ts           | shared processed_events persistence            | read then conflict-safe insert; separate from handler transaction                                                                        |
| dead-letter.service.ts             | shared dead_letter_events + dead-letter queue  | DB insert then queue add, configured identity; full event/reason retention needs producer/privacy review                                 |
| postgres-activity.projector.ts     | Activity-owned read model                      | only activity_entries writes; three supported events, sourceEventId idempotency, retraction COALESCE; no producer-table lookup           |
| password-recovery.processor.ts     | Auth-owned delivery persistence                | ACTIVE ID/email/authVersion row lock, monotonic digest upsert, commit before SMTP; no Users profile query                                |
| email-verification.processor.ts    | Auth-owned delivery persistence                | ID/email/ACTIVE/unverified lock, monotonic digest upsert, commit before SMTP                                                             |
| security-email-alert.processor.ts  | private Auth mail rendering/delivery           | no DB query; fixed kind/time/email, sanitized delivery failure                                                                           |
| media-processing.processor.ts      | Media processing orchestration                 | status-based duplicate handling; scan failure quarantines; no other module tables                                                        |
| media-processing.types.ts          | Media processing interfaces/results            | internal binary metadata/keys; not a public profile/security aggregate                                                                   |
| postgres-media-processing.store.ts | Media-owned SQL persistence                    | media/variants only; variants and READY original in one transaction with row-count check; physical file effects are outside DB atomicity |
| local-media-file.processor.ts      | Media LOCAL filesystem IO                      | shared key resolver before effects, bounded image pixels; trusted directory/DEBT-037 physical-containment limit remains                  |
| clamav-media-malware.scanner.ts    | Media scanner IO                               | shared key resolver, INSTREAM, bounded 4096-byte response/timeout; no permission or source-table decision                                |

## Queue privacy and delivery boundaries

Auth's three producers explicitly copy only supported delivery fields. Password
recovery and verification queues contain delivery IDs/email/time, not raw tokens.
Credentials are generated in Auth-owned workers, digested in DB, raw tokens only
enter the intended SMTP fragment link. Producer jobs remove on completion/failure;
SMTP errors are sanitized. This is source evidence, not proof of external provider
retention, successful delivery, or every historical Redis record.

Media job keys/provider/bucket/checksum/variant metadata are necessary internal IO
facts, not permission to expose them through content APIs. LOCAL remains the only
implemented worker provider. S3 parity is not claimed. Core Outbox dispatch copies
event payload/metadata and retains integration jobs; DLQ copies the full event and
error reason. Review every producer and operator access/retention before declaring
generic payload privacy complete. Current shared jobs types contain no domain DB
repositories; unknown integration payload is not a blanket safe-data contract.

## Idempotency and identity evidence

The shared processor orders hasProcessed → handler → markProcessed. It is not one
database transaction and does not guarantee exactly-once arbitrary handlers.
Current Activity inserts use sourceEventId conflict protection; retraction uses
COALESCE. A retry after handler-before-marker failure therefore relies on the
handler's owned idempotency. Do not weaken it or claim generic atomicity.

Read-only diagnostic uses actual compiled processor and DeadLetterService with
in-memory adapters, plus TypeScript AST inspection of main.ts (main is not loaded,
so no Redis/PG/SMTP connections). Source factory call has two arguments; configured
identity is v2; both marker operations observe v1; DLQ consumer/job suffix observe
v2. This confirms DEBT-061's mismatch, not event loss or an exploit.
Choosing a corrected identity needs historical marker/replay semantics; do not
blindly rename v1 to v2 during an unrelated ownership transfer.

## Remaining acceptance

Worker table-access classification is now explicit. Full producer lifecycle,
delivery-time availability/retraction, operational retention, real store rollback
and replay verification remain separate matrix items. Existing unit tests alone
do not prove actual PostgreSQL/queue recovery behavior. D5 owns missing/abbreviated
passports; D6 owns separately scoped correctness/reliability defects. No Worker
source, timeout, queue setting, storage policy or consumer name changed here.
Full D4 API/Core/root inventory and D4.4/D4.5 remain open.
