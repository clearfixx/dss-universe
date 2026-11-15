# DEBT-094 — Concurrent intake of one Media upload session

Date: 2026-11-08. Source baseline: accepted main `bab5557` (PR142).
Status: characterization accepted in PR143; separate runtime correction candidate.
The original reproduction and failed fixture evidence below remain historical.

## Observed behavior

Two authenticated multipart `PUT /api/media/uploads/:id/content` requests for
one INITIATED session both return HTTP200 and COMPLETED. They create distinct
Media rows in PROCESSING, while real BullMQ retains only one job with
`jobId=session.id`. Consequently one of those rows has no corresponding job
in the observed queue. This is an intake integrity/availability defect, not
evidence of a quarantine bypass or data disclosure.

The sequential control returns200 followed by409, creates one Media row and
retains one job. An invalid JWT returns401 before changing the INITIATED
session or publishing a job. All uploaded bytes are the same harmless1x1 PNG;
the actual local provider reads those bytes back from the temporary key.

## Deterministic reproduction

`apps/api/test/media-intake-concurrency.e2e-spec.ts` uses real AppModule
authentication, guards, multipart parsing, Media services/repositories and an
isolated PostgreSQL schema populated by the actual migrations. Registration
and its password hashing run in setup, outside the unchanged per-test deadline.
No Auth, database result, MIME result or storage operation is mocked.

A forwarding spy waits after each of the two real repository reads has
returned INITIATED. It releases both snapshots together, then delegates all
writes unchanged. This schedules an interleaving already permitted by the
production code; it does not manufacture either snapshot. Queue publication
and removal forward to a uniquely named real BullMQ queue on disposable
loopback Redis6380. No Worker consumes this queue. The schema, generated local
upload directory and queue are owned by the fixture and cleaned up separately;
no shared database reset, queue purge or production service restart occurs.

The first fixture attempt failed because it read the token from the wrong
registration response field and looked up a repository by class instead of
its registered token. Typecheck exposed the token error. Its red JSON is
retained: SHA256
`0694f015201602d76e9f0149fa4ad75863a99e2a18a9505515721234c59e76e1`.
After correcting only fixture wiring, API typecheck passed and the focused
run passed3/3, including the duplicate-intake characterization. Corrected JSON
SHA256:
`adb972550e930df1c9840664ac555b18281ed2f6d1139ffb2a0ba7e02235b4ab`.
These focused results do not substitute for final full-gate/CI evidence.

The accepted characterization intentionally asserted the duplicate behavior.
Its green result proved reproduction, not resolution. The runtime candidate
below replaces that assertion with one successful intake and one conflict.

## Cause and proposed bounded correction

At the characterized baseline, `MediaBinaryUploadService.accept` reads the owned session and validates its
INITIATED state, then separately calls `updateStatus(UPLOADING)`.
`PrismaMediaUploadSessionRepository.updateStatus` updates by ID without an
expected-status predicate. Both requests can therefore pass validation before
either claims the session. Each subsequently generates its own mediaId but
publishes with the same queue jobId.

Separate runtime scope subsequently approved by the owner:

- Media owns an atomic conditional INITIATED→UPLOADING claim before file IO.
- The claim loser receives409 before entering compensation, so it cannot
  delete the winning attempt's temporary file/job or change its session.
- Preserve successful transport responses, declaration/MIME/checksum checks,
  the existing queue contract and the winner's compensation behavior.
- Verify concurrent HTTP outcomes, real persisted rows/jobs/bytes, sequential
  repeat, invalid JWT and failure compensation; run full gate and CI.
- No migration, new global lease, Worker redesign or frontend changes.

Abort also has a separate read/update sequence. Its interleavings are not
reproduced by this packet, and an upload claim alone must not be advertised as
solving cancellation or all Worker/intake races. Neither current compensation
cross-effects nor terminal-state overwrite are established here.

## Plan and scope

The characterization was recorded as a separate pre11 candidate under D7. The owner requires
outside-phase defects to be documented and runtime changes agreed separately;
no correction is folded into this characterization. Full gate, CI and packet
acceptance remain open at this checkpoint. DEBT-094, DEBT-007/090 and D7 remain
open; stack audit and Phase11 are not started.

Acceptance update: the owner accepted characterization PR143 at `d0ce753`,
merged as `a4ab472`. Its exact-source local full gate exited0 without sleep,
CI8/8, API coverage1466/1466, E2E692/692, build6/6 and Web15/15 without retries.
That acceptance preserves the reproduction; it does not resolve DEBT-094.

This issue involves concurrent website/API calls by the same valid owner.
It is independent of the accepted owner/DSS-only filesystem writer model.
It does not reopen the deferred DEBT-037 hostile-OS-writer native research.

## Approved runtime candidate

The owner separately authorized implementation before accepting PR143. Branch
`debt/debt-094-atomic-upload-claim` starts from accepted main `a4ab472`.
`MediaUploadSessionRepository.claimInitiated` returns a boolean from one
conditional update by ID and INITIATED status, setting UPLOADING and clearing
completedAt just as the former transition did. Existing metadata is preserved;
an unsuccessful predicate changes no row, including updatedAt.

`MediaUploadSessionService.claimUpload` maps false to ConflictException and
preserves unknown repository errors. Binary intake calls it after the existing
ownership, expiry, declaration, MIME and checksum checks, before the compensation
try block. Exactly one concurrent intake reaches file IO; its existing successful
response, mediaId/jobId contract and compensation remain in place. The new
concurrent loser gets409 and cannot save/delete bytes, publish/remove jobs,
create/update Media or mark the session FAILED.

The real two-INITIATED-read HTTP schedule now asserts sorted outcomes200/409,
one PROCESSING row, one actual BullMQ job and matching completed metadata.
A second schedule holds the winner after the real file write: the loser returns409
while the session remains UPLOADING and its bytes remain readable. Releasing the
winner completes the upload. A queue-publication fault is injected separately
to verify the winner still compensates to FAILED and physically removes its
temporary file; this is not evidence of a real Redis outage. Direct migrated-DB
controls reject claims from all five non-INITIATED states without changing the
persisted record. Sequential repeat and invalid-JWT controls remain.

Focused candidate evidence: typecheck and strict lint pass; unit11/11 and
DB/HTTP/Redis10/10 pass. The unit JSON SHA256 is
`cc6c71bee12e3103671f7323af781b8eadd9b55d889cb5bbfb38fd39989023aa`;
the integration JSON SHA256 is
`725f93aaacff1f914cc355b3dea517124fd472b91d557ea8b1d5220b6cbafcb3`.
Two strict-lint method-reference findings in new unit assertions were corrected
before the successful focused run, without changing assertions or runtime logic.
The first full gate on runtime head `35aec05` passed coverage5/5/API1469 and
Media10/10, but ended698/699 at E2E because of the separately documented
[DEBT-095 IAM timeout](DEBT_095_IAM_PERMISSION_DENIAL_TIMING.md). Later local
build/Web stages were not reached. Exact-head CI8/8 includes E2E699/699,
build6/6 and Web15/15. The failed local report remains retained; the runtime
packet stays draft and is not accepted. A subsequent final integrated head
still needs full verification and owner acceptance.

No migration, new transaction/isolation/timeout, lease system, dependency,
frontend, ACL or native activation change. The claim does not guarantee global
exactly-once processing, solve abort during an in-flight upload, or coordinate
Worker execution with intake finalization. Existing session-expiry/now semantics
are preserved. DEBT-007/090 and final D7 acceptance remain separate.
