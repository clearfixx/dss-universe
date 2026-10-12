# D3.4 — IAM permission persistence boundary

> Branch: `debt/d3-auth-identity-boundary`, draft PR #7.
> Status: permission adapter implemented; roles/access and acceptance remain open.

## Result

IAM PermissionsService now coordinates conflict/not-found policy through its own
private PermissionRepository. Prisma queries and creation audit moved to
PrismaPermissionRepository. The contract carries explicitly owned permission
fields and commands; it exposes neither an ORM type nor a transaction. DTO files
remain transport-only. Neither the repository token nor adapter is publicly exported.

Creation and its existing audit commit atomically. Updates/deletions preserve the
existing behavior and response fields, including timestamps; no new audit policy,
permission decision, JWT format, schema, migration or frontend behavior is added.
Concurrent duplicate creation still relies on the existing database unique
constraint; this transfer does not introduce a new concurrent-conflict API policy.

## Evidence

- Eight service regressions cover duplicates, missing records, own versus another
  key, creation allowlisting and failed mutations. Four real DB tests cover exact
  return fields, actor/system audit, rollback after a real audit insert, concurrent
  uniqueness, ordering, update and deletion.
- The DB suite requires `RUN_IAM_DB_TESTS=1` and uses a unique disposable schema
  with copied permission/audit tables and local domains over the real audit enums.
  The initial fixture lacked those type names; after repair all twelve focused
  tests pass. Only that schema is dropped; public tables are untouched by this suite.
- Full uncached monorepo units with `--env-mode=loose --force` and
  `RUN_AUTH_DB_TESTS=1`, `RUN_RECOVERY_DB_TESTS=1`, `RUN_AUTH_REDIS_TESTS=1`,
  `RUN_IAM_DB_TESTS=1` pass: API 96 suites / 477 tests, Web 59, Worker 36.
  No API skips; API duration 41.566 seconds.
- Four selected real AppModule E2E pass (22 unselected), 36.429 seconds. New IAM
  coverage verifies authentication/permission denial before writes, response
  allowlisting, CRUD, duplicate conflict, missing-record behavior and failed audit
  rollback through HTTP. Existing login lock, recovery and 2FA regressions pass.
- Typecheck, Prisma validation and production build pass. Architecture fixtures
  and inventory check pass: exactly the resolved IAM service persistence finding
  was removed from the baseline, leaving 143 known findings. No findings added.

Final lint/typecheck and changed-file formatting/whitespace checks pass. The
initial lint run caught a fixture formatting issue and test typing/mock issues;
all are corrected. The final focused rerun passes twelve service/DB tests and
the IAM HTTP E2E (5.644s). Root format initially reported 42 files including that
fixture; the fixture is now formatted, leaving the known 41 inherited deviations.
Full CI/release acceptance remains separate baseline work.
Dependency audit remains red with 0 Critical, 1 High and 10 Moderate advisories;
this package changes no manifest or lockfile. GraphQL generation succeeds but
consistency exits 1 on a generated barrel comment (DEBT-044); its isolated
verification side effect was restored. No schema or operation drift was found.
CI observed on previous head `cf7357b`: containment passed on Windows/Linux,
dependency audit and Web smoke failed, aggregate quality was still running.

## Remaining D3 work

RolesService and UserAccessService still directly use Prisma. IAM wildcard/public
exports need review alongside their consumers. Authorization still reads persisted
assignments through its existing repository. DEBT-043 records a further acceptance
gap: JWT-derived request permissions can outlive revoked IAM grants. The new IAM
adapter does not fix that path. A separate security increment must establish
authoritative current access without making Auth own IAM assignments.

D3.5 generic groups/Premium requires its separately scheduled brainstorm and scope
approval. Phase 11 remains unstarted.
