# DEBT072 — Profile assignment / cleanup serialization design

Date: 2026-10-21. Base: `5372db30672d826196e12938be2bc2fcc259c1ec` / draft PR69.
Branch: `debt/debt072-profile-cleanup-design`. Approved design plus test-only protocol
evidence; production correction is not implemented in this packet.

Runtime follow-up at406b874: the separate approved correction is now locally
implemented; see [current implementation evidence](DEBT_072_PROFILE_CLEANUP_IMPLEMENTATION.md).
The design/probe outcomes below describe their original named base, not the
current corrected production path. CI/release acceptance remains separate.

The owner approved a separate pre-11 design/correction package and explicitly
approved the exact conditional-write / P2034 whole-batch defer design below
on2026-10-21, including the physical-write cost and contention-related delay.
This review stack is not an accepted release baseline or a red-gate waiver.

## Required outcome and fixed boundaries

The [actual HTTP audit](../audits/D4_ROOT_OWNER_SQL_RECONCILIATION.md) proves
avatar/cover assignment can commit after cleanup has claimed its Media as
DELETING. Completion then leaves a DELETED asset with an active profile binding.

Required for both profile slots: assignment and cleanup must not both commit
that stale schedule. If assignment wins, cleanup must exclude it or abort before
returning any storage keys; if cleanup wins, assignment must reject without
retiring previous references, changing profile fields or committing assignment
Audit. Assignment rollback must not strand a permanent claim or block cleanup.

Retain public API/GraphQL/error contracts, readiness/ownership/PUBLIC rules,
Media metadata including updatedAt, variant policy, Audit atomicity, existing
default assignment isolation and Serializable cleanup. No schema migration,
global lock, timeout increase, positive cache or storage-provider change.
Auth/Users/IAM remain independent; business ports still contain no Prisma.
Do not impose profile READY policy on News drafts. This does not certify all
content-reference writers, arbitrary deletion paths or every profile race.

## Why a lock-only patch is insufficient

Cleanup reads candidate absence in its existing Serializable transaction. Its
snapshot may predate a waiting assignment's committed reference/profile changes.
A lock-only assignment can release the row without making a conflicting row
version; cleanup then proceeds using its earlier snapshot. This was reproduced,
not assumed from the word Serializable.

PostgreSQL documents this distinction between locking and actually updating a
row, including an update that retains values. The design uses that property,
not a global isolation change.
[PostgreSQL17 application consistency](https://www.postgresql.org/docs/17/applevel-consistency.html).

## Approved owned write guard

Media publishes one named infrastructure-only function through its guarded
technical entry, `guardReadyPublicProfileMediaForAssignment`.
It accepts the supplied transaction plus only mediaId and subjectId and returns
a boolean. It owns a parameterized conditional write equivalent to:

```sql
UPDATE media SET status = status
WHERE id = :mediaId AND "ownerId" = :subjectId
  AND status = 'READY' AND visibility = 'PUBLIC'
RETURNING id;
```

This is a physical MVCC write/row-level synchronization point, **not** a Media
lifecycle transition. Raw parameterized SQL deliberately leaves updatedAt and
all business columns unchanged; a naive Prisma update may change updatedAt.
No URL/profile/credential data is returned. Do not replace it with a plain read
or SELECT FOR UPDATE on the assumption these are equivalent.

The guarded write replaces the existing readiness SELECT rather than adding a
second round trip. It still incurs physical write/WAL and row-contention costs;
no performance improvement or zero-overhead claim is made. It must not refresh
retention age or rewrite metadata. Existing dangling bindings, if any, are not
automatically repaired or DELETED media resurrected: the actual binary state is
unknown. Read-only integrity checks and a separately approved repair are required
before changing historical user data.

Root profile-asset assignment invokes the owned guard first inside the current
transaction, replacing its unlocked Media read. False retains the current
ConflictException/message. Success then follows the existing order: retire old
references, insert new reference, update Users slot/URL, append Audit, commit.
No extra transaction, permission, role or module-to-module import is introduced.
The root remains responsible for transaction lifetime and cross-owner writes;
Media owns the new technical predicate/write.

Current caller trace: both PrismaAvatarRepository and PrismaCoverRepository
delegate assignment/removal to this same profile-asset port/root. Users'
profileUpdateData explicitly copies display/URL fields, not avatarMediaId or
coverMediaId. Literal binding-write search in current API/Worker src locates
these User writes at the profile root; News coverMediaId is a different content
field and stays outside this protocol. This bounded source check does not
certify external/manual DB writers or computed future consumers.

## Cleanup conflict policy: rollback and defer, not partial success

Root Media library retains its existing Serializable transaction and complete
Media-owned candidate/recheck/Audit algorithm. A stale cleanup trying to update
the guarded row is rejected by PostgreSQL. On the actual17.11/Prisma7.10 stack,
the probe observes PrismaClientKnownRequestError P2034 from updateMany.

Approved adapter behavior: after the transaction has rejected/rolled back,
recognize **only** that known Prisma error class with code P2034 (Prisma's
write-conflict/deadlock category), return an empty claim batch, and let the next
normal configured or manual invocation start a fresh transaction. Do not catch
arbitrary errors, inspect message strings, retry a statement inside the aborted
transaction, return earlier keys from the rolled-back batch, or swallow storage
failures. No immediate retry loop, new timer/backoff/timeout or success Audit.

The whole batch defers, including unrelated candidates processed before the
conflict; their claims/Audit roll back together. This trades one cleanup cycle
of latency for safe profile success and no storage IO on an aborted batch.
Sustained contention can defer work repeatedly; this is not bounded-time cleanup
or a new scheduling guarantee. With the cleanup timer disabled, another manual
invocation is required, just as any other pending cleanup needs an invocation.

Explicit handling is necessary: the current retention timer discards runOnce's
promise, and its per-candidate catch begins only after claims return. The new
expected conflict must not become an unhandled rejection at that boundary.
Other inherited failure paths are not silently redesigned by this package.

PostgreSQL requires a fresh whole-transaction attempt after serialization
failure; the next existing invocation provides it rather than continuing the
aborted snapshot.
[PostgreSQL17 failure handling](https://www.postgresql.org/docs/17/mvcc-serialization-failure-handling.html).

## Competing outcomes and ordering

| Schedule                                              | Required result                                                                                                                  |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Cleanup committed DELETING before the guard           | Guard returns false; current assignment conflict; no new binding/reference/Audit                                                 |
| Assignment guard wins and commits while cleanup waits | Cleanup's stale write aborts; its entire batch/Audit roll back; adapter yields no keys; next scan excludes the committed binding |
| Assignment guard wins but its transaction rolls back  | Lock/version/reference/profile/Audit roll back; waiting cleanup may claim the now-unused media                                   |
| Binding committed before a new cleanup snapshot       | Existing absence predicates exclude the asset                                                                                    |
| Cleanup claims another asset first, then conflicts    | No partial keys or claims escape; fresh next invocation may claim the unrelated asset                                            |

Guard exactly one target Media before profile/reference writes; no lock over all
Media or users. Cleanup retains current candidate order and write locking. Slot
removal creates no new reference/binding and needs no write guard for this
invariant. Concurrent removal may delay cleanup to a later invocation but does
not authorize attaching a cleanup-claimed image. No Storage IO occurs under the
assignment transaction or before a committed cleanup claim.

## Test-only design evidence and limitations

[Protocol probe](../../apps/api/test/media-profile-serialization-design.e2e-spec.ts)
applies all real migrations in an owned random schema on disposable5435.
PostgreSQL reports17.11. Assignment is deliberately a test-only SQL prototype,
not a replacement provider or proof of a production HTTP fix. Cleanup uses the
actual root adapter/Media operations and Audit uses the actual writer.

Ten cases cover both AVATAR/COVER: lock-only unsafe control, physical write guard
rejecting stale cleanup, complete batch rollback/fresh progress, reverse ordering
and assignment/Audit rollback. Blocking is established by observing
pg_blocking_pids against the assignment's actual backend PID, not sleep. Guarded
assignment uses observed Read Committed; cleanup isolation stays Serializable.
All Media business fields, including updatedAt, remain unchanged after a winning
write guard. No Storage IO, timer, queue, HTTP session or production migration is
exercised by this probe. The original six HTTP audit cases still characterize
the unfixed runtime and must later be converted to safe-outcome regressions.

Initial8/8 protocol cases pass in3.282s and expanded10/10 in3.887s, normal exit0.
Final focused24/24 across3 suites, zero skipped,23.927s, normal exit0: protocol10,
original HTTP audit6 and existing reputation/profile-asset8. The final probe also
asserts actual Read Committed and the known Prisma error class. The full quality
gate is recorded below after execution. Prototype P2034
assertions intentionally observe the real current adapter throwing; production
conflict-to-empty behavior is proposed, not present or accepted from these tests.

## Implementation verification for the approved follow-up

- Unit-test the exact named Media guard: parameterization, owner/readiness/PUBLIC
  predicates, missing/terminal/foreign media rejection, no updatedAt mutation.
- Pin root ordering: guard before reference retirement/profile/Audit, existing
  conflict errors and transaction options. No broad service export/ORM port.
- Root cleanup catches real known P2034 only, yields no partial keys; unexpected
  errors still propagate. No hidden transaction retry or new timeout.
- Convert both actual GraphQL raced outcomes to safe behavior with PostgreSQL
  barriers; cover assignment-first, claim-first and concurrent waiting/recheck.
- Update this prototype's live-root conflict assertions to the approved empty
  batch outcome when the runtime adapter gains the catch. Preserve separate
  actual underlying P2034 evidence and the lock-only negative control; do not
  leave an expectation that the corrected public adapter must still throw.
- Exercise real Audit-failure rollback, unrelated-candidate batch rollback and
  a fresh cleanup invocation; preserve both slot variants/removal and privacy.
- Exercise retention with an IO observer proving zero delete calls from an
  aborted claim, then fresh progress, without deleting real user files.
- Full format/lint/types/Prisma/migrated E2E/coverage/build/architecture/license/
  dependency/GraphQL gates, CI/review and owner acceptance. Inherited reds remain
  separately tracked; neither the probe nor a new draft PR closes Phase11 gates.

## Packet verification

Current local gate: API coverage1206/1206,160 suites, zero skipped,78.527s,
normal exit0, with all four IAM/Auth/recovery/Redis DB opt-ins enabled on5434.
Workspace lint/typecheck9/9, Prisma validation/generation, architecture/license
140/140 and frozen inventory0 pass. Build6/6 (five cached),19.208s, exits0.
Editor23, Storage43, Worker46, Web59 and dependency patch14 tests pass.

Node24.18.0 and pnpm11.9.0 are verified. PostgreSQL/Redis dev and disposable
containers, ClamAV and Mailpit report healthy; this packet does not perform new
SMTP/scan/provider IO smoke tests. Only the validated Compose tmpfs DB5435 is
recreated after zero other clients/owned schemas, and all migrations apply before
the full sequential E2E. Dev5433 is never reset or migrated here.

Global format remains red on41 pre-existing files. Dependency audit exits1 with
0 critical /2 high /12 moderate; no dependencies/lockfile change or exception.
GraphQL generation succeeds but consistency remains red on DEBT044's single
generated barrel comment. Only that verified side effect is restored exactly;
before full E2E, SDL SHA256 is
`C03170CB54027C557F662A5B9BF5F85CAFA2112B8623D3FCA360E8FA9C82FD2C`
and Git reports no schema/operation output diff. No SDL read/generation runs
while full E2E is active.

Full fresh migrated E2E:562 PASS /1 FAIL of563,52 suites, zero skipped,441.511s.
Only DEBT045 fails (News viewCount expected null versus actual0 and the inherited
cleanup trying to delete a target that requires retirement). App27/27,
News security31/31, profile-asset8/8, original Media HTTP audit6/6 and the new
protocol10/10 all pass. The passed HTTP audit still demonstrates the unfixed
runtime, not production correction acceptance.

The complete JSON was produced before cleanup of retained handles. Zero other
DB clients and zero owned fixture schemas were verified; only the exact
completed Jest14980 for this outputFile was stopped. Original shell reports
exit1 after that cleanup, not normal green exit. No forceExit, skipped assertion,
timeout increase or DB protection bypass. After completion, the full SDL keeps
the same SHA256 and generated schema/operation output has no diff. No production
source, migration, dependency or Web edit/file removal is included.

Scoped format/diff, truthful new test Passport/named imports and73 local
documentation links pass. Owner's untracked STACK_AUDIT_PLAN is not staged or
changed; SHA256 remains
`B1D657CFCEA43DF16636E9C79F4BB62BF4F94848B31780234C2364CBA557796A`.
Runtime correction, review/CI acceptance, remaining D4/D5/D6/D7, stack audit and
Phase11 brainstorm remain outside completion of this design/probe packet.

Parent draft PR69 at5372db3: Linux/Windows containment pass, Web smoke and
dependency audit fail, main quality job remains IN_PROGRESS at the observed
snapshot. This is not CI/review acceptance. Scope is design/prototype only;
production runtime remains unchanged and this is not the DEBT072 correction.
