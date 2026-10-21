# DEBT072 — Profile assignment / cleanup runtime correction

Date: 2026-10-21. Base: `406b8745a9e7b95bdf05489587a73a402f56cd64` / draft PR70.
Branch: `debt/debt072-profile-cleanup-atomicity`.
Owner-approved [design](DEBT_072_PROFILE_CLEANUP_DESIGN.md), locally implemented;
full verification/publication/CI/review acceptance are recorded separately below.

## Applied boundary

- [Media-owned guard](../../apps/api/src/modules/media/infrastructure/repositories/prisma-profile-media-write.guard.ts)
  performs one parameterized conditional physical UPDATE of status to itself,
  requiring ID/opaque owner/READY/PUBLIC, returning only a boolean. No timestamp,
  retention age or business metadata changes. This is a row-version write, not
  an equivalent plain read/SELECT FOR UPDATE and not a lifecycle transition.
- [Guarded technical entry](../../apps/api/src/modules/media/infrastructure.ts)
  explicitly exports only the existing Media operations and the single approved
  new guard. Public business exports/ports and MediaModule providers do not grow.
- [Profile root](../../apps/api/src/composition/profile-assets/infrastructure/prisma-profile-asset.transaction.ts)
  replaces its unlocked readiness read with that guard first in the existing
  default transaction. False keeps the existing Avatar/Cover ConflictException
  text. Reference retirement/insert, Users slot/URL write and Audit retain order
  and atomicity. Removal is unchanged.
- [Cleanup root](../../apps/api/src/composition/media-library/infrastructure/prisma-profile-aware-media-library.ts)
  preserves the entire Media-owned algorithm, Users absence predicate and
  Serializable scope. Only known PrismaClientKnownRequestError P2034 yields an
  empty batch **after rollback**. No partial keys, immediate retry, new timer,
  backoff, timeout or success Audit. All other thrown values/errors propagate.

The next normal configured/manual invocation obtains a fresh transaction. Under
sustained contention, an entire batch may defer repeatedly; bounded cleanup
latency is not promised. Successful assignment incurs a physical write/WAL cost
but replaces the old SELECT rather than adding another round trip. Auth/Users/
IAM business code, permissions, API/GraphQL, schema/migrations, dependencies and
frontend remain unchanged. News draft readiness rules are not tightened.

## Red-before and focused evidence

Before runtime edits, the new cleanup unit boundary reports6 PASS/1 FAIL:
current P2034 propagates instead of returning an empty batch. Converted actual
HTTP tests report4 PASS/2 FAIL: both AVATAR/COVER schedules lack the required
cleanup wait. Normal red exits1 are preserved in separate reports. These are
behavioral failures, not a missing-export/compilation assertion.

After the runtime change, focused unit19/19 across3 suites pass, normal exit0,
1.283s. Initial own unit parameter table had a malformed empty-array row that
Jest interpreted as a done callback; it was corrected to object cases without
changing production code or any timeout. SQL parameterization/no timestamp
write, guard-first ordering, exact conflict messages, unchanged removal and
known-P2034-only classification are pinned by:

- [Media guard unit](../../apps/api/src/modules/media/infrastructure/repositories/prisma-profile-media-write.guard.spec.ts);
- [profile transaction unit](../../apps/api/src/composition/profile-assets/infrastructure/prisma-profile-asset.transaction.spec.ts);
- [cleanup root unit](../../apps/api/src/composition/media-library/infrastructure/prisma-profile-aware-media-library.spec.ts).

First actual DB/HTTP green run25/25 passes in12.238s. Expanded focused39/39
passes in24.867s; after test-only lint corrections, the final focused run repeats
39/39, zero skipped,3 suites,25.110s, normal exit0: actual HTTP/lifecycle12, protocol/
guard predicates19 and the existing reputation/profile-asset8 rollback cases.
Final focused unit repeat is19/19, zero skipped,3 suites,1.539s, normal exit0.

## Migrated SQL and actual HTTP matrix

[HTTP regression fixture](../../apps/api/test/media-profile-cleanup-claim-audit.e2e-spec.ts)
uses actual authenticated AppModule mutations, all migrations in its owned schema,
actual Media repository/retention/Audit, and PostgreSQL-observed lock waits.
No access decision or SQL result is mocked. Temporary triggers exist only in
the owned schema; original immutable-history protections stay active.

| Case, both AVATAR/COVER                                        | Observed required outcome                                                                                                                                       |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existing committed binding before cleanup                      | Asset stays READY; cleanup excludes it                                                                                                                          |
| Cleanup already committed                                      | Assignment is denied; no new reference/binding                                                                                                                  |
| Assignment wins, cleanup waits                                 | Assignment succeeds, Media business fields stay identical; entire stale cleanup yields no keys, later scan excludes binding                                     |
| Cleanup holds an uncommitted claim, assignment waits           | Guard rechecks after cleanup commit; exact current conflict; previous profile/reference and Audit remain unchanged                                              |
| Actual Audit INSERT fails after guard/reference/profile writes | All assignment writes roll back; waiting cleanup claims safely; previous binding/reference preserved; no failed assignment Audit persists                       |
| Earlier unrelated candidate, then guarded assignment conflict  | Retention returns0 and performs zero delete calls; earlier claim/Audit roll back; fresh run claims/deletes only the unused fixture asset and commits completion |

Only StorageService.delete is replaced by an explicit IO observer in the last
pair, to record keys without deleting physical files. Fresh claim/finalization
and both Audit records are real DB operations. This is storage-call/lifecycle
evidence, **not** real filesystem, S3/MinIO, antivirus or queue proof.

[Updated SQL probe](../../apps/api/test/media-profile-serialization-design.e2e-spec.ts)
now invokes the actual Media guard. A pass-through observer preserves actual
owned cleanup calls/results and records the underlying known P2034 while root
correctly returns an empty batch. The lock-only negative control remains a
deliberately weaker test protocol, never the production assignment path.
Missing/foreign-owner/PRIVATE and every non-READY Media state are rejected without
business-field writes. Assignment prototype writes remain SQL-only; the separate
HTTP matrix is what proves production assignment behavior.

All barrier ordering uses observed PostgreSQL advisory/row blocking with bounded
polls, not sleep; production transaction timeouts/isolation stay unchanged. All
Media business fields, including updatedAt, compare equal after winning guards.
Closed avatar/cover slots and canonical variants remain enforced upstream.

## Existing data and limitations

An aggregate read-only query against the existing local dev database found0
User profile joins to Media in DELETING/DELETED. No identities, profile contents
or credentials were returned. This checks those lifecycle states only, not all
possible legacy inconsistencies. Dev5433 was not reset, migrated or repaired.
The package does not resurrect DELETED media or rewrite historical bindings.
Any later confirmed integrity issue needs its own evidence/repair decision.

This is not a global Media lease or proof for every content-reference writer,
manual deletion path, storage failure or arbitrary concurrent profile mutation.
The [original finding](../audits/D4_ROOT_OWNER_SQL_RECONCILIATION.md) and design
evidence remain historical at their named source bases. New runtime regressions
replace their vulnerable-state assertions with safe outcomes.

## Quality gate and release disposition

| Gate                                                              | Current local result                                                              |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Lint / typecheck                                                  | PASS,9 tasks each                                                                 |
| Prisma validation / generation                                    | PASS; no schema/migration change                                                  |
| Architecture / licenses / frozen inventory                        | PASS,140 tests,0 findings; not a compliance certificate                           |
| Build                                                             | PASS,6 tasks                                                                      |
| Full API with DB/Redis opt-ins and coverage                       | Final explicit `--runInBand`:1225/1225,163 suites,0 skipped,54.072s, normal exit0 |
| Adjacent Editor / Storage / Worker / Web / dependency-patch tests | PASS:23 /43 /46 /59 /14                                                           |
| Global format                                                     | FAIL,41 inherited files; no blanket formatting performed                          |
| Dependency audit                                                  | FAIL,0 critical /2 high /12 moderate; no exception or dependency change           |
| GraphQL consistency                                               | Generation succeeds; check exits1 on inherited DEBT044 generated barrel comment   |
| Full fresh migrated E2E                                           | FAIL:576/578,52 suites,0 skipped,430.764s; all39 targeted DB/HTTP cases pass      |
| CI / independent review / release acceptance                      | Pending; draft only                                                               |

API evidence retains the initial green1225/1225 (97.921s) and the intervening
1223/1225 failure (116.893s): the unchanged email-verification repository test
`invalidates old-address proof when email change waits behind Worker issuance`
and the next beforeEach exceeded5000ms. Cause is not established; this is not
automatically DEBT048's separate broad App registration case, nor evidence of a
Media runtime defect. The isolated unchanged file subsequently passes14/14 in
2.550s. A coverage repeat without explicit in-band mode also passes1225/1225;
the final explicit in-band run above is the sequential acceptance observation.
No Auth code/test, timeout, assertion or production retry behavior is changed.
One green retry does not establish that the earlier timeout cannot recur.

The full E2E report starts2026-10-21T10:06:35.067Z and finishes all assertions
at10:13:45.833Z. News repeats DEBT045's viewCount expected null/actual0 plus the
retirement-protected cleanup error. Leaderboards repeats the DEBT045/DEBT069
shared-ledger fixture tie. Read-only inspection of the two reported synthetic
subjects confirms ACTIVE `points-user` created10:12:22.749 UTC versus
`leader-oldest` created10:12:43.380 UTC, both with ten current-month points.
The unchanged points-desc/createdAt-asc/ID-asc ordering explains the result;
production ranking is not changed or filtered to test fixtures. The proposed
separate D6 fixture-isolation correction still needs its own approval.

Jest retained handles after writing the complete578-test JSON. Zero other DB
clients and zero owned api_boundary schemas were verified before stopping only
the exact completed own Jest12452 for this outputFile. Original shell then exits1;
this is not normal green termination, forceExit or a skipped assertion. No
physical file, dev data, production trigger or source file is deleted.

GraphQL verification's own generated comment/newline side effect was restored
with an exact-content guard. Git confirms no schema/operation output difference;
SDL SHA256 before full E2E is
`C03170CB54027C557F662A5B9BF5F85CAFA2112B8623D3FCA360E8FA9C82FD2C`.
No generation, global Git diff/status or schema hashing runs during full E2E.

Reports remain local under `node_modules/.cache/debt072-runtime-*`: `unit-final`,
`focused-final`, `api`, `api-final`, `auth-diagnostic`, `api-serial` (coverage
repeat without explicit in-band mode), `api-inband`, `e2e-full`, and named gate
logs. Failed/intermediate evidence is retained, not replaced by the latest run.
Draft publication will not waive inherited red gates or establish CI/independent
review/owner release acceptance. Remaining D4/D5/D6/D7, the owner stack-boundary
audit and Phase11 brainstorm remain required.
The owner's2026-10-21 checkpoint limits current autonomy to D4: stop and report
after its completion; do not execute later stages without a new command.

Final scoped format covers all15 packet files and passes;122 local documentation
links resolve, diff checks pass, and no source file is deleted. The owner's
untracked stack audit plan is excluded and unchanged at SHA256
`B1D657CFCEA43DF16636E9C79F4BB62BF4F94848B31780234C2364CBA557796A`.
