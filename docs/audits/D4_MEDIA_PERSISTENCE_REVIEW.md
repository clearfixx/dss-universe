# D4 — Media persistence review (work in progress)

Date: 2026-10-18. Baseline `87aec38` / draft PR #33, not accepted.
Branch `debt/d4-media-persistence-review`. Source-only review; no runtime changes.
This supplements the partial persistence matrix, not full Media/D4 acceptance.

## Sources read completely

Media infrastructure repositories: `prisma-media.repository.ts`,
`prisma-media-upload-session.repository.ts`, `prisma-public-attachment.reader.ts`,
`prisma-media-publication-evidence.reader.ts`,
`prisma-media-image-eligibility.reader.ts`. Both Media infrastructure mappers.
Application services: MediaAccess, MediaDelivery, MediaRetention, MediaLibrary,
MediaUploadSession and MediaUrlSigner. HTTP MediaDeliveryController.
Avatar/cover are covered by the prior tranche; binary-upload, quarantine, job
and full GraphQL transport reconciliation still require review.

## Operation matrix

| Operation                               | Ownership and exact boundary                                                                                                                                                                                                                                                                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| media create/findById/update            | Owned Media rows; internal full domain mapping includes storage data, not a public DTO allowlist. Missing find returns null; writes throw on missing.                                                                                                                                                                                                  |
| findByOwnerId/findQuarantined           | Owner list excludes status DELETED; quarantine requires QUARANTINED and deletedAt null. createdAt/updatedAt DESC respectively; no tie-breaker in these two lists.                                                                                                                                                                                      |
| browseLibrary                           | Optional case-insensitive filename/MIME/checksum, owner/status/kind/visibility filters; createdAt DESC/id DESC cursor; first+1 then trim. No default deleted filter. Application restricts general browsing with MediaLibraryRead, own-ready browsing fixes owner/status.                                                                              |
| getLibraryMetrics                       | Five independent parallel reads, not one snapshot. Original/variant totals exclude DELETED; orphan test reads active references and avatarFor/coverFor relations. These profile relations require ownership reconciliation, not an assumption that physical relations are business-owned by Media.                                                     |
| softDelete/countActiveReferences        | Separate update and count; softDelete sets status and timestamp. This alone does not prove concurrent reference/delete safety.                                                                                                                                                                                                                         |
| findPublicVariant/findPublicOriginal    | Require READY/PUBLIC/deletedAt null. Internal results carry storage coordinates for byte delivery; HTTP receives content/MIME/checksum and optional original filename, not coordinates.                                                                                                                                                                |
| findDeliveryCandidate                   | Variant plus parent owner/status/visibility, parent deletedAt null. Does not itself enforce READY or viewer authorization. Caller responsibilities below are essential.                                                                                                                                                                                |
| claimCleanupCandidates                  | Serializable transaction; aged READY/FAILED/REJECTED or any DELETING, no active references or profile avatar/cover. Conditional update rechecks reference/profile absence and allowed states; appends claim Audit in same transaction. Returns original/temporary/variant keys. No cross-process exclusive DELETING claim is established by this read. |
| completeCleanup                         | Conditional DELETING→DELETED/timestamp plus Audit transaction; no-op for other states. Binary removal happened outside this transaction.                                                                                                                                                                                                               |
| cleanup failure/rescan evidence         | Audit-only transaction. Cleanup error is bounded by service to 500 characters; raw error may contain provider details and needs operator/privacy review.                                                                                                                                                                                               |
| claimFailedRetry                        | Conditional FAILED→PROCESSING clears failure fields, reads row and appends Audit atomically; missing/wrong state returns null.                                                                                                                                                                                                                         |
| retry queue failure                     | Conditional PROCESSING→FAILED with bounded stored reason (2000); appends failure Audit even if update count zero. Queue outcome and row transition require lifecycle tracing.                                                                                                                                                                          |
| rejectQuarantined                       | Conditional QUARANTINED→REJECTED plus Audit; wrong state returns null.                                                                                                                                                                                                                                                                                 |
| upload session create/find/updateStatus | Owned session full row mapping. updateStatus is unconditional by ID, resets completedAt to null by default, preserves metadata when null is passed. Service checks owner and allowed abort state in a preceding read, not atomic CAS. Concurrency remains unproved.                                                                                    |
| public attachments                      | Active exact target/type/purpose references, requested IDs, READY/PUBLIC/deletedAt null; filename/MIME/extension/size/checksums/public URL only. Empty IDs short-circuit, failures propagate; query order unspecified.                                                                                                                                 |
| publication evidence                    | Selects only ownerId/visibility/status, maps nullable owner/public/ready. No deletedAt condition; do not infer an exploit without caller/lifecycle tracing.                                                                                                                                                                                            |
| attachable image                        | Exact ID/owner, IMAGE/READY/deletedAt null count=1. Visibility intentionally not checked; this is not a public delivery grant.                                                                                                                                                                                                                         |

## Delivery and lifecycle distinctions

MediaAccess issues a five-minute HMAC capability after READY and visibility rules:
PUBLIC/AUTHENTICATED allowed for authenticated caller, owner allowed, RESTRICTED
requires MediaRestrictedRead. Token contains media/variant/subject/expiry, not keys.
Signed HTTP route verifies the capability then checks current existence/deletion
and READY. It does not use subjectId or re-evaluate current visibility/permissions.
This is observed bearer-capability behavior, not yet a newly confirmed security
defect: reconcile intended revocation contract, guards and existing tests first.
Public delivery has one-year immutable caching; source checks do not revoke
already cached bytes. Privacy/visibility transition policy remains to be reviewed.

Retention has a process-local running flag, batch 50, default 30 days, optional
timer (disabled at interval zero). It deduplicates storage keys, deletes bytes,
then completes the DB transition. Errors are audited; DELETING allows retry.
Serializable claim transaction does not include external storage deletion.
Do not claim multi-instance delete idempotency or reference-race safety from it.

## Evidence and remaining work

This is source evidence only; no live HTTP leak, concurrency defect or provider
parity is certified. Next: binary upload/job/quarantine and GraphQL mapping,
profile-relation ownership, signed-capability revocation expectations, existing
regressions and deterministic DB characterization where needed. New runtime
corrections require separately scoped approval; do not implement them here.

PR #33 inspected at head `87aec3850a511a10fb98bfceb4182b4882abf2b7`:
dependency audit FAIL; quality, Web smoke and both containment jobs still live
at that snapshot. No merge/acceptance inferred. User stack audit plan untouched.

## Intake, administrative queues and presentation follow-up

Additional complete reads: MediaBinaryUploadService, MediaJobService,
MediaQuarantineService, MediaResolver and all three GraphQL mappers (upload
session, library, quarantine). Corresponding model schemas, HTTP upload limits,
Worker processing/store and global guard reconciliation remain pending.

- Intake reads an owned INITIATED session, checks expiry, buffer/size/name,
  inspected MIME, policy and optional SHA-256; computes SHA-1/MD5 as metadata.
  It updates UPLOADING separately, saves temporary bytes, creates PROCESSING
  Media with persisted processingJob, queues session-ID job (three attempts,
  exponential backoff), then marks session COMPLETED. COMPLETED here means
  accepted/queued, not binary READY or successful scan.
- Failure compensation is best-effort Promise.allSettled: FAILED session,
  temporary deletion, queued-job removal and FAILED Media where applicable.
  Failed compensation results are not surfaced separately. Worker may already
  have acquired a job before removal; do not claim transactional queue rollback.
  Concurrent accept/abort schedules still need real characterization.
- Retry requires MediaJobsManage and FAILED, validates persisted processingJob
  and matching mediaId, then conditionally claims PROCESSING before dispatch.
  Queue failure invokes repository compensation. Rescan requires
  MediaQuarantineManage and QUARANTINED, queues a unique rescan job before
  appending rescan Audit. Audit failure therefore is not proof of no queued job.
  Rejection uses the conditional audited transition. All are existing behavior,
  not changes authorized or implemented by this audit.
- MediaResolver has JwtAuthGuard. Library, job and quarantine use cases apply
  their respective permissions; editorMedia explicitly ignores caller-supplied
  owner/status and fixes them to authenticated owner/READY through the service.
- GraphQL upload/library mappers explicitly select fields: no storage key,
  bucket, temporaryKey, processingJob or arbitrary metadata. Quarantine mapper
  additionally exposes failureReason only through permission-checked use cases;
  provider-error privacy still requires tracing the origin of these strings.

Existing five service suites pass 17/17 tests, 3.416s: binary upload, retry jobs,
quarantine, access and delivery. Tests include queue failure compensation, final
session persistence failure, permission denial and wrong lifecycle state. These
mock-adapter unit tests do not establish actual BullMQ removal, migrated DB
rollback, concurrent intake safety, HTTP guard integration or malware scanning.

## HTTP and Worker continuation

Complete additional reads: MediaUploadController, Worker media processor,
PostgresMediaProcessingStore, LocalMediaFileProcessor, ClamAvMediaMalwareScanner,
and the six-case media processor unit suite. Worker main media wiring inspected.

- HTTP PUT content is authenticated, accepts one in-memory `file` with 25 MiB
  interceptor limit, rejects absent file and maps the resulting session through
  the safe mapper. Aggregate memory/rate limits require wider HTTP review.
- Worker main actually constructs Media worker with PostgreSQL store, LOCAL
  file processor and ClamAV scanner. This is distinct from the missing automatic
  gamification integration route documented elsewhere.
- Processor validates the job, short-circuits READY/REJECTED/DELETED, scans when
  scanRequired, quarantines infected/unavailable scans, restores clean
  QUARANTINED to PROCESSING, transforms, persists READY, then best-effort deletes
  temporary source. Failed source cleanup is swallowed. Other transformation or
  persistence failures conditionally record FAILED and rethrow for queue retry.
- Store writes only Media/variants. markReady upserts variants then conditionally
  updates PROCESSING parent in one transaction; a failed update rolls variants
  back. markFailed only changes PROCESSING; quarantine updates only PROCESSING
  or QUARANTINED; markProcessing only changes QUARANTINED.
- **Candidate requiring migrated reproduction:** after a non-scan transient
  failure, row is FAILED. Automatic repeat does not call markProcessing for
  FAILED, while markReady requires PROCESSING. Existing test named “persists
  processing failures before retrying” asserts only first failure against mocks;
  it does not run the actual second attempt/store. No new defect ID, fix or live
  queue failure claim yet. Manual retry explicitly claims PROCESSING and is a
  separate path.
- LOCAL processing validates all keys before filesystem effects, rejects other
  providers, limits image input to 40 million pixels, rotates/re-encodes WebP;
  passthrough copies bytes. Partial output cleanup on failed transform remains
  to be traced. Shared key validation is lexical; symlink threat remains DEBT-037.
- Scanner is LOCAL-only, validates key before socket access, streams INSTREAM,
  bounds response to 4096 bytes and uses configured timeout. Only OK is CLEAN;
  FOUND quarantines; unexpected/network errors fail closed via processor.
  Source inspection/unit doubles do not certify a live ClamAV service.

## Migrated retry characterization — DEBT-063 confirmed

`scripts/audit-media-retry.mjs` runs actual built Worker processor/store against
all current migrations in an owned private schema on loopback test DB 5434.
The schema is removed in finally; no dev DB reset or history protection bypass.
Only file processor/scanner are boundary doubles: first transform throws a
synthetic transient error, second returns a valid result, scanner returns CLEAN.
Actual PostgreSQL transitions establish FAILED after attempt one and still FAILED
after attempt two rejects its PROCESSING-only update. Explicit administrative
PROCESSING claim control then reaches READY. Diagnostic exits zero; its assertions
pin undesired behavior, not remediation. Initial fixture attempt used nonexistent
MediaKind FILE and failed before processor execution; corrected to DOCUMENT.
No live queue, real filesystem transform or ClamAV availability proof is claimed.

The earlier retry candidate is now DEBT-063, not merely an inference. Requested
separate atomic retry-claim design/fix with migrated regressions preserving
quarantine/terminal/deletion/manual-retry behavior, API and deadlines. Approval
pending; audit changes no production code. Full packet gates/publication pending.

Fresh Worker build and repeat diagnostic both pass, establishing that the result
does not rely on a stale dist artifact. GraphQL library/quarantine/upload model
schemas were subsequently read completely and agree with the mapper allowlists;
no storage-coordinate fields are declared. Authenticated decorator expands to
JWT and legacy Roles guards (no role metadata supplied by upload). These source
reads still do not substitute for HTTP integration or capability revocation tests.

Checkpoint gates: syntax check and migrated diagnostic PASS; Worker fresh build
PASS; 36 Worker unit tests PASS; selected five API service suites 17 PASS. Root
lint/typecheck PASS (cached unchanged source), production build PASS with fresh
API, Prisma validation PASS, architecture check PASS and frozen 84-finding
baseline unchanged. Changed-file formatting/diff checks PASS. Full API coverage
1101 and E2E 479 PASS / 1 inherited News failure belong to parent PR #33, not new
runs for this audit. Production source remains unchanged; full global gate is
not newly certified green, and inherited format/audit/GraphQL blockers remain.
