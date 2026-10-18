# DEBT-063 — Media automatic retry claim design

Date: 2026-10-18. Branch `debt/media-automatic-retry`, parent `f72edda` / PR #35.
Owner approved the separate correction package and confirmed the exact CAS
boundary below on 2026-10-18. No runtime implementation in this design checkpoint.

## Required invariant

A valid automatic repeat after transient processing failure must restore a FAILED
row to PROCESSING before scanner/transform, so successful work can commit READY.
It must not resurrect rejected/deleted/deleting content or bypass malware checks.
Preserve existing manual retry, clean quarantine rescan, public API, attempts,
backoff, transaction deadlines and storage provider scope.

## Proposed bounded change

Add a Worker-store semantic `claimFailedRetry(mediaId): Promise<boolean>`.
PostgreSQL performs one conditional UPDATE FAILED→PROCESSING, clears old failure
fields and returns rowCount===1. No ORM/transaction crosses the contract.
Keep this distinct from existing QUARANTINED→PROCESSING after clean rescan.

Processor first observes status. READY/REJECTED/DELETED/DELETING short-circuit
without filesystem or scanner effects. On FAILED, acquire CAS before entering
scan/transform error handling. A loser re-reads authoritative status: terminal
states short-circuit, others throw retryable claim-unavailable outside the
attempt catch, so it cannot mark another attempt FAILED. A winner proceeds with
current scanner rules; scanner unavailability/infection can now quarantine the
PROCESSING row. Ordinary initial PROCESSING/manual retry stays compatible.

This reserves a failed-state transition, **not an exclusive whole-attempt lease**.
A different job that first observes PROCESSING is not distinguishable from a
legitimate initial/manual attempt by this schema. Do not describe CAS as global
filesystem serialization. Adding lease identity/expiry or keeping DB transactions
open during binary IO is a materially different design, not silently included.
Existing quarantine/rejection races and multi-job partial-file interactions need
separately demonstrated requirements and approval if they require broader work.

## Verification plan

- Replace bad-behavior diagnostic with successful automatic repeat invariant.
- Real migrated store: simultaneous FAILED claims yield one winner; no terminal
  or missing-row revival; failure fields clear only for winning row.
- Processor loser never scans/transforms/cleans/marksFailed; terminal transition
  after initial FAILED read is rechecked without resurrection.
- Failed repeat with scanner unavailable/infected remains quarantined, not READY.
- Existing PROCESSING initial/manual and clean QUARANTINED rescan keep behavior.
- Actual store markReady variant writes rollback if final state changed.
- Keep API/Worker regression suites and full quality gate, including known global
  failures; separate draft PR and owner acceptance, no Phase 11 implementation.

Source review: actual Worker processor/store/types/main and consumers searched.
Media failure listener logs attempts; it does not itself reclaim FAILED.
Known diagnostic demonstrates actual DB problem, not live BullMQ scheduling.
Implementation is authorized within the confirmed boundary above; complete the
current Achievements audit checkpoint first, then resume the separate retry
branch. User stack audit plan untouched.

## Implementation checkpoint

Worker store now conditionally claims FAILED with deletedAt null, clears failure
fields and returns rowCount===1. Processor invokes it before scanner/transform;
lost claims re-read terminal state or fail outside the attempt catch. DELETING
joins the no-processing states. No schema/API/deadline changes or global lease.

Worker unit suites pass 46/46; Worker lint/typecheck/build pass. Fresh-built
processor/store migrated PostgreSQL diagnostic now verifies automatic second
attempt reaches READY without administrative repair, then READY delivery is a
no-op. Only file/scanner boundaries are doubles. Actual concurrent CAS, terminal
store predicates, scanner failure after retry and variant rollback regressions,
full quality gates and PR remain pending. This checkpoint does not close debt.

Migrated follow-up passes: external row lock holds both actual CAS contenders
(observed through test-pool application_name and lock wait state); after release
exactly one returns true and the other false. Failure fields clear for winner;
READY/REJECTED/DELETED/DELETING/QUARANTINED/PENDING/PROCESSING, missing and
FAILED-with-deletedAt rows are not claimed. Actual retry scanner-unavailable and
infected paths quarantine without transform; clean rescan reaches READY. Failed
markReady after parent became REJECTED rolls back its variant insert.

Initial concurrency observer counted only transactions directly blocked by the
holder and missed the second waiter in PostgreSQL lock chain (1 instead of 2).
Corrected observer counts both actual locked UPDATEs in the uniquely named test
pool, including indirect blocking; CAS outcomes/production code unchanged.
No live BullMQ/filesystem/ClamAV certification or global job lease claimed.

Current packet full API coverage passes 1101/1101 tests, 148 suites, zero skips,
57.514s with all four DB/Redis opt-ins. Root lint/typecheck, Prisma validation,
build and architecture pass; frozen inventory remains 84 known findings.
Worker coverage passes with 46 tests and unchanged thresholds. Global format
remains red on 41 inherited files; dependency audit remains one high/ten moderate.
Adjacent packages, full E2E, GraphQL check and publication still pending at this
checkpoint. Do not infer closure from the successful retry diagnostic.

Adjacent gates now pass: Editor 23, Storage 43 coverage, Web 59 coverage
(maxWorkers=2), dependency patches 14; changed-file format/diff checks pass.
Full API E2E is running separately in session 5562 on verified tmpfs loopback5435
after project/service/port checks, zero-client check, recreation, empty public
tables and fresh migrations, without seed. No dev database touched. Final E2E,
GraphQL, PR and CI/review acceptance remain pending.
