# D4 root SQL / owner composition reconciliation

Date: 2026-10-21. Base: `47cd877db3455d94196e260c0438134757ed4dcf` / draft PR68.
Branch: `audit/d4-root-owner-sql-reconciliation`. Evidence-only; not D4 acceptance.

## Scope and method

Read all18 current production SQL-bearing root composition files below, including
their full operation bodies. Inventory: tracked non-test TypeScript under
`apps/api/src/composition` containing PrismaService, @prisma/client, queryRaw,
executeRaw or Pool. This is a lexical SQL-bearing inventory, not every root
adapter, every transitive owner implementation or a proof of runtime correctness.
Sorted path + newline + raw file bytes + newline SHA256:
`f6dd9a88ce27d174e68229a04ba7e2a3758b3f2250723f737aa0e0f0aef06b24`.

Compare the observed orchestration with
[ADR004](../architecture/adr/004-module-integration-contracts.md) and the
previously approved [profile-asset](D4_2_REPUTATION_PROFILE_ASSETS.md) and
[content-target](D4_3B_ATOMIC_CONTENT_TARGETS.md) root transaction contracts. Guarded infrastructure-only
owner adapters are allowed; business ports must not expose Prisma. Earlier
explicit multi-owner root writers are not newly classified as violations just
because later transfers reuse owner fragments. Review field/result boundaries,
statement ordering and transaction lifetime independently from static inventory.
No runtime, SQL, isolation, timeout, schema, dependency or UI change is included.

## Current operation map

Paths below are relative to `apps/api/src/composition/`. Default transaction means
the existing client/database default, not a new stronger isolation guarantee.

| File                                                                      | Observed ownership / preserved boundary                                                                                                                 |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| authorization-reads/infrastructure/prisma-authorization-subject.reader.ts | Auth subject predicate + IAM select/mapper; one nested read, no ACTIVE filter or positive cache                                                         |
| comment-writes/infrastructure/prisma-comment-write.transaction.ts         | Root default transaction; Interactions writer; transaction-local mention callback for create/edit/tombstone                                             |
| comment-writes/infrastructure/prisma-mention-recipient.resolver.ts        | Users candidate subquery joined to Auth ACTIVE IDs in one parameterized SQL; ID order, empty-input skip, Users name matching                            |
| content-targets/infrastructure/prisma-news-draft.transaction.ts           | Explicit root draft/target/Media reference/revision/search projection/Audit/Outbox transaction; save version/author/state CAS, slug-conflict mapping    |
| content-targets/infrastructure/prisma-profile-wall.transaction.ts         | Explicit root Wall/target/Media reference/Audit/Outbox transaction; tombstone metadata and reference retirement; Users owns response redaction          |
| gamification/infrastructure/prisma-manual-award.transaction.ts            | Achievements writer + Users transaction-local ID-only existence; default transaction, no new ACTIVE rule                                                |
| gamification/infrastructure/prisma-title-grant.transaction.ts             | Custom Titles writer + Users transaction-local ID-only existence; default transaction                                                                   |
| iam-subject-reads/infrastructure/prisma-iam-assignment.reader.ts          | Auth anchor + IAM assignment select/mapper; one all-state existence-anchored nested query                                                               |
| iam-transactions/infrastructure/prisma-membership-grant.transaction.ts    | IAM writer + Auth transaction-local subject existence; current default transaction                                                                      |
| iam-transactions/infrastructure/prisma-role-revocation.transaction.ts     | IAM writer/safety callback + Auth anchor; explicit ReadCommitted retained for post-role-lock count                                                      |
| identity/infrastructure/prisma-registration-transaction.ts                | IAM baseline-role lookup, shared Auth/Users INSERT from owned fragments, IAM assignment; one transaction, opaque ID result, sessions/mail outside       |
| leaderboards/infrastructure/prisma-leaderboard-ranking.reader.ts          | Auth/Users/Points/Reputation/Levels/Titles/Leaderboards fragments, one parameterized SQL CTE; population sentinel and safe facts mapping                |
| media-library/infrastructure/prisma-profile-aware-media-library.ts        | Users absence predicate + Media operations; independent browse/five metrics, existing Serializable cleanup transaction                                  |
| news-delivery/infrastructure/prisma-news-delivery.read-unit.ts            | News + Users public actor facts + Interactions readers; existing Repeatable Read for composed responses; eligibility before data, missing-actor failure |
| profile-assets/infrastructure/prisma-profile-asset.transaction.ts         | Explicit root Media readiness/owner/PUBLIC recheck, references + Users fields + Audit in default transaction; cleanup interleaving finding below        |
| reputation/infrastructure/prisma-reputation-write.transaction.ts          | Owner ledger writer and attributable response/Audit/Outbox callbacks in one default transaction; missing actor aborts                                   |
| reputation/infrastructure/prisma-reputation.read-unit.ts                  | Owner ordered originals/reversals/count/score + Users actor projection; default transaction history, separate original lookup, empty actor skips        |
| users-profiles/infrastructure/prisma-users-profile.persistence.ts         | Users/Auth/IAM guarded fragments for eight operations; safe display projection; current list batch and single-query update preserved                    |

The direct News/Wall/profile-asset root algorithms are documented earlier, not
silently new exceptions. Moving their internals again is not authorized by this
audit. The current inventory does not certify every transitive owner fragment;
remaining family/current-state and independent acceptance work stays explicit.
In particular, different existing transaction boundaries must not all be
advertised as Repeatable Read or globally atomic authorization. The approved
DEBT071 eligibility precheck/statistics-write split remains unchanged.

## DEBT-072: cleanup can retire a newly assigned profile image

### Source path and causal boundary

- [Root profile assignment](../../apps/api/src/composition/profile-assets/infrastructure/prisma-profile-asset.transaction.ts)
  reads READY, ownership and PUBLIC inside its transaction, then inserts a
  reference and writes profile fields. The readiness read is not serialized with
  the cleanup transition in the observed schedule.
- [Root Media library](../../apps/api/src/composition/media-library/infrastructure/prisma-profile-aware-media-library.ts)
  runs the [Media-owned claim](../../apps/api/src/modules/media/infrastructure/repositories/prisma-media-library.operations.ts)
  under existing Serializable isolation. The claim rechecks active reference and
  [Users profile-binding absence](../../apps/api/src/modules/users/infrastructure/repositories/unused-profile-asset.where.ts)
  before setting DELETING. The uncommitted assignment is not visible there.
- [Media repository](../../apps/api/src/modules/media/infrastructure/repositories/prisma-media.repository.ts)
  public variant reads require READY; completeCleanup CAS checks DELETING, then
  writes DELETED + Audit without checking newly committed bindings.
- [Retention application](../../apps/api/src/modules/media/application/services/media-retention.service.ts)
  invokes Storage deletion before DB completion. That is source evidence of the
  production sequence, **not** exercised binary deletion in this audit.

### Real migrated DB/HTTP schedule

[Six characterization tests](../../apps/api/test/media-profile-cleanup-claim-audit.e2e-spec.ts)
use actual AppModule, authenticated GraphQL mutations, Media repository and full
migrations in an owned random schema of disposable loopback DB5435. No access
decision, SQL result or media lifecycle operation is mocked. Presence observation
only drains the real side effect for reliable fixture teardown.

For each AVATAR and COVER:

1. Sequential control: assign first; cleanup excludes the committed binding and
   the media stays READY.
2. Sequential control: cleanup claim first; assignment is denied and creates no
   reference/profile binding.
3. Race: an owned-schema BEFORE INSERT trigger pauses the assignment's first
   profile reference after its real in-transaction readiness read. A separate
   control connection holds an advisory lock; the test observes the waiting
   PostgreSQL lock, rather than assuming a sleep establishes the ordering.
   Actual cleanup claims the still-unreferenced asset and commits DELETING.
   Unlocking lets the actual mutation return success and commit a binding plus
   active reference. Public variant lookup returns null. Calling actual DB
   completeCleanup then leaves DELETED with the binding and active reference.

Temporary trigger/function exist only in the owned fixture schema and are
removed in finally; connection/app/schema cleanup follows. Default production
transaction timeouts/isolation are unchanged. StorageService, binary IO, real
retention timer and queue processing are not invoked. No stolen asset access,
credential disclosure, cross-user data leak or physical binary loss is proved.
Risk is confirmed lifecycle/data integrity, severity Medium.

Initial isolated run:6/6, zero skipped,10.260s; completed JSON and no matching
Jest process were observed after recovering the previous tool output. The
original shell exit value was not recovered, so no normal-exit claim is made for
that initial run. Final sequential verification is recorded separately below.
Passing these vulnerable-state characterizations is **not** correction acceptance;
the later correction package must change the raced expectations to the agreed
safe outcome, not retain a test that celebrates the defect.

### Disposition

Owner approved a separate pre-11 design/correction package on2026-10-21.
First agree shared assignment/cleanup synchronization and deterministic competing
schedules, then implement atomic protection while preserving API, Audit and
Media terminal states. Exact lock protocol/isolation decision remains open.
Do not assume Serializable cleanup alone serializes a default-isolation peer.
Do not silently impose profile READY rules on News draft attachments, whose
non-READY draft lifecycle is intentional. Broader content-reference protocols
need explicit scope and evidence rather than speculative fixes in this audit.

## Verification and remaining work

Fresh local checks: API coverage1206/1206,160 suites, zero skipped,103.480s,
normal exit0, all four Auth/IAM/recovery/Redis opt-ins enabled on disposable5434.
Workspace typecheck9/9, Prisma validation/generation, architecture/license140/140
and frozen inventory0 pass. Build6/6 (five cached) passes in25.325s. Adjacent
Editor23, Storage43, Worker46, Web59 and dependency patch14 tests pass. These are
local checks, not full CI/review acceptance.

Initial lint failed only on formatting in the new audit test; Prettier corrected
that file and the final workspace lint rerun exits0. Scoped changed-file format
and diff checks pass. Global format remains red on41 pre-existing files.
Dependency audit exits1 with0 critical /2 high /12 moderate; this is a fresh
count, not the previous packet's1 high /11 moderate. Current Vite launch-editor
advisories include GHSA-698v-4r3x-3vcv, GHSA-r825-w8mm-5pxw and
GHSA-587h-7wmj-h5pm; braces and other advisories remain. No dependency or lockfile
is changed, and no exploitability/mitigation-acceptance claim is made. DEBT016
remains the existing dependency remediation package.

Focused final sequential E2E14/14 across2 suites, zero skipped,19.786s, normal
exit0: new audit6 and existing reputation/profile-asset8, including rollback.
Both public DB user count and remaining owned schemas/other clients were0 before
the distinct full E2E launch. No active-suite SDL read or generation was performed.

Full fresh migrated E2E:552 PASS /1 FAIL of553,51 suites, zero skipped,448.832s.
Only DEBT045 fails: News viewCount expected null versus actual0, followed by the
known cleanup attempt to delete an interaction target that requires retirement.
App27/27, DEBT071 News security31/31, reputation/profile assets8/8 and new Media
characterization6/6 pass. This does not close inherited fixture/stability debt.
Jest retained handles after writing the complete report. Zero other DB clients
and zero owned fixture schemas were verified; only the exact completed Jest4252
for this outputFile was stopped. Original shell reports exit1 after cleanup;
this is not a normal green termination, forceExit or an assertion bypass.

GraphQL generation succeeds; consistency exits1 for existing DEBT044, adding only
the generated Web barrel eslint-disable comment. Only that verification side
effect is restored, guarded against any unexpected output. The full SDL SHA256
remains `C03170CB54027C557F662A5B9BF5F85CAFA2112B8623D3FCA360E8FA9C82FD2C`;
schema and Web operation output have no Git diff after restoration. No manual
generated-code redesign is included. Scoped formatting/diff checks, one new test
Passport/named-import check and86 local documentation links pass.

The owner's untracked STACK_AUDIT_PLAN is unstaged/unchanged at SHA256
`B1D657CFCEA43DF16636E9C79F4BB62BF4F94848B31780234C2364CBA557796A`.
No production source or file removal is part of this packet; only disposable
owned test schemas/triggers and the verification-generated comment are cleaned.

Parent draft PR68 at47cd877: Linux/Windows storage containment pass; Web smoke
and dependency audit fail; main quality job still IN_PROGRESS at the snapshot.
No merge or inherited-gate waiver is authorized.

After this packet: the separate DEBT072 design, remaining D4 current-state /
owner-fragment and seventeen-family disposition, D5/D6/D7, owner stack-boundary
audit, then the required Phase11 brainstorm. No automatic stack replacement or
Phase11 implementation is authorized by these source/test findings.
