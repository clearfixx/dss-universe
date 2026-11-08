# DEBT-094 — Concurrent intake of one Media upload session

Date: 2026-11-08. Source baseline: accepted main `bab5557` (PR142).
Status: confirmed defect; characterization candidate, runtime unchanged.

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

The characterization intentionally asserts the observed duplicate behavior.
A green result proves reproduction, not resolution. The future runtime package
must replace that assertion with one successful intake and one conflict.

## Cause and proposed bounded correction

`MediaBinaryUploadService.accept` reads the owned session and validates its
INITIATED state, then separately calls `updateStatus(UPLOADING)`.
`PrismaMediaUploadSessionRepository.updateStatus` updates by ID without an
expected-status predicate. Both requests can therefore pass validation before
either claims the session. Each subsequently generates its own mediaId but
publishes with the same queue jobId.

Proposed separate runtime scope, subject to owner approval:

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

Record as a separate pre11 correction candidate under D7. The owner requires
outside-phase defects to be documented and runtime changes agreed separately;
no correction is folded into this characterization. Full gate, CI and packet
acceptance remain open at this checkpoint. DEBT-094, DEBT-007/090 and D7 remain
open; stack audit and Phase11 are not started.

This issue involves concurrent website/API calls by the same valid owner.
It is independent of the accepted owner/DSS-only filesystem writer model.
It does not reopen the deferred DEBT-037 hostile-OS-writer native research.
