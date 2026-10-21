# D4 Media / Users profile-asset runtime ownership

Date: 2026-10-20. Branch: `debt/d4-media-profile-asset-runtime`.
Base: `8caa115` / draft PR #61, not an accepted release baseline.

## Scope and authority

Owner explicitly approved this separate runtime package after the
[foundation](D4_MEDIA_PROFILE_ASSET_FOUNDATION.md). Preserve three existing
operations without API/schema/timeout/isolation changes. No frontend work.

## Implemented boundary

- Users owns `unusedProfileAssetWhere()` with only avatarFor/coverFor null
  filters, published through its guarded infrastructure entry, never its
  business root. The function does no IO, status or permission lookup.
- Media owns the repository-neutral three-method `MediaLibraryPersistence`
  port. `PrismaMediaRepository` delegates browseLibrary, getLibraryMetrics and
  claimCleanupCandidates; its other operations remain in place.
- Media's guarded `PrismaMediaLibraryOperations` retains the original filters,
  pagination, mapping, five independent metrics reads, cleanup candidate loop,
  guarded update, temporary-key extraction and transactional Audit.
- Root `PrismaProfileAwareMediaLibrary` supplies the Users predicate to the
  Media operations. It starts exactly the previous Serializable cleanup unit
  of work. Ordinary browse/metrics do not gain a transaction. Root exports only
  the semantic token through a global binding module, following existing
  composition conventions; no feature imports the composition module.

There are no direct feature-to-feature imports, new tables, cache, lease,
transaction timeout/retry or permission changes. The predicate appears in both
cleanup selection and guarded update. READY/FAILED/REJECTED strict age cutoff,
DELETING recovery regardless of age, active-reference filter, order/take,
storage-key order and successful-claim-only audit are retained.

A read-only comparison against base8caa115 confirms normalized method bodies
for browse, metrics, temporary-key extraction and the inner cleanup transaction
remain equal after substituting the supplied predicate and client parameter.
This supports mechanical preservation; it is not an independent security or
concurrency proof.

The technical adapter accepts Prisma types only inside guarded infrastructure;
no ORM reaches the business port. Its external absence predicate is supplied
only by reviewed root assembly, not an HTTP/GraphQL argument or generic SQL API.

## Evidence and current verification

The original 3 query-shape and 5 real PostgreSQL scenarios now execute the actual
repository → root → Media operations path and pass unchanged assertions. Three
additional composition tests prove exact token/provider metadata, fresh narrow
Users predicate, unchanged delegation arguments/results and failure propagation.
Focused total: 11/11, including 5 PostgreSQL tests. Fixtures clone migrated
tables/enums into their own random schema; they are not a fresh full migration
replay or a concurrent-attachment safety proof.

Exact public/technical export tests were initially red on the intended new
symbols, then updated to explicit allowlists. New negative analyzer fixtures
reject application and foreign-feature consumers of both technical entries.
Architecture140/140 passes, frozen inventory zero; no baseline waiver.
Full API coverage passes 1168/1168 in 159 suites, zero skipped, 84.78 seconds,
with all four DB/Redis opt-ins enabled. Workspace lint/typecheck and Prisma
validation pass. Build was interrupted by an environment change; the original
handle and build processes were confirmed absent. A new build then completed
all six tasks successfully (54.59 seconds); no observation-timeout restart.

Docker Desktop was stopped after the interruption. Starting the installed
application restored Engine29.8.2. Test Redis6380 and disposable PostgreSQL5435
were then brought up under their verified Compose projects; dev DB was not
reset. Fresh production migrations succeeded before the runtime E2E launch.
The unit/coverage evidence predates this Docker restart, on unchanged sources;
it is not represented as a post-restart unit run.

Fresh adjacent checks pass: Editor23, Storage43, Worker46, Web59 and dependency
patches14. Global format remains red on 41 inherited files; dependency audit
remains red with 1 high and 10 moderate findings. Authored-file Prettier and
diff checks pass. No unrelated formatting or dependency updates were made.

Fresh migrated full E2E completes 506 PASS / 3 FAIL / 0 skipped of 509,
48 suites, 406.722 seconds. App27/27 and Media2/2 pass. Failures: DEBT-045
viewCount null/zero and two recurring DEBT-053 search transaction-budget
failures (numbered/cursor pagination and concurrent viewers; 5279ms/5086ms
observed against unchanged 5000ms). Leaderboards passes this run; that does not
close the separately reproduced DEBT-069 fixture-contamination risk.

Completed Jest retained handles after full JSON. Zero DB clients and zero
api_boundary schemas were verified, then only matching Jest PID20128 was
stopped; original shell E2E=-1, not normal green completion. No rerun, skip,
timeout increase, corpus reduction or weakened assertion.

GraphQL generation succeeds; consistency remains red on inherited DEBT-044
eslint-disable drift. Only this run's generated comment/newline effect was
restored; SDL/generated files then match Git. SDL SHA256 remains
`C03170CB54027C557F662A5B9BF5F85CAFA2112B8623D3FCA360E8FA9C82FD2C`.
Logs/JSON are ignored under node_modules/.cache/d4-media-runtime-\*.

Remaining acceptance: inherited red gates, independent review and CI. Prior foundation results are
not substituted for runtime verification. Inherited format/audit/DEBT-044 and
E2E debts remain explicit, not silently waived. D4/Phase11 acceptance is open.

## Limits and follow-up

This transfer does not introduce a lock protocol with avatar assignment and
does not claim concurrent attachment safety from sequential fixtures. Preserve
that unproved schedule in review rather than changing transaction behavior
inside an ownership-only packet. Storage deletion remains external to claims.

Notifications surface reconciliation and remaining operation-level evidence,
D4 acceptance, D5–D7, the owner stack-boundary audit and Phase11 brainstorm remain
required. Owner's untracked STACK_AUDIT_PLAN.md is excluded from this packet.
