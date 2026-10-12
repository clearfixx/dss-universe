# D3.4 — IAM role persistence boundary

> Branch: `debt/d3-auth-identity-boundary`, draft PR #7.
> Status: role adapter implemented; subject assignments/public API review remain open.

RolesService now owns name conflicts, missing-role/permission decisions and
existing IamSafetyService policy through private RoleRepository operations.
PrismaRoleRepository owns explicit selectors, ordered projections, nested role
creation and role-permission writes. No ORM types or transaction clients cross
the port. Neither token nor adapter is exported through the IAM public API.

Role response fields, ordering, HTTP errors, protected/system-role policy and
deletion response are preserved. Distinct permission IDs are checked for
existence, but nested writes retain the original IDs and duplicate constraint
behavior. Role creation remains atomic with its nested assignments. Existing
audit policy and separate assignment/read sequencing are unchanged; this is not
a new concurrency or audit protocol. No dependency, schema, migration, frontend
or GraphQL operation changes are included. File Passport 3.1 documents ownership.

## Verification

- Twelve service tests cover allowlisted commands, duplicate/missing entities,
  normalized protected role names, system-role denial, metadata conflicts,
  deletion shape, assignment errors and propagated persistence failure.
- Three real PostgreSQL tests cover exact safe fields, ordering, metadata and
  assignment lifecycle, concurrent uniqueness, cascade removal and rollback of
  nested role creation after duplicate/missing permission failures. Each suite
  owns a random schema; copied tables have explicit foreign keys matching the
  production schema. Public test data is not truncated or dropped.
- Final focused service/DB run: 15 pass, 1.514 seconds.
- Full uncached units with all Auth/recovery/Redis/IAM DB opt-ins: API 99 suites /
  496 tests, Web 59, Worker 36 pass. API duration 41.586 seconds. The subsequent
  mock-typing repair changes no behavior and its focused rerun passes.
- Five real authorization E2E pass, 9.718 seconds: role HTTP authentication and
  permission denial before writes, CRUD and allowlisted output, duplicate/missing
  assignment behavior, system-role denial, plus all same-token REST/GraphQL
  grant/revoke and fail-closed regressions.
- Monorepo lint, typecheck, Prisma validation and build pass. Initial lint
  rejected unbound mock-method typing; inferred factory mocks now satisfy the
  private contract without disabling the rule.
- Architecture fixtures: 28 pass. Exactly the two resolved RolesService Prisma
  imports were removed from the reviewed baseline: 143 to 141 findings, none
  added. The final baseline check matches.
- Root format remains red on 41 inherited files; changed files are formatted.
  Full API E2E was not rerun after this transfer: its preceding 44/46 result and
  News cleanup/open-handle failures remain DEBT-045, not a green acceptance claim.
  Dependency, GraphQL generation consistency, Web smoke and required CI gates
  remain unresolved as recorded in the debt register. This PR must remain draft.

CI observed on preceding head `bd1be59`: Windows/Linux containment passed;
dependency audit and Web smoke failed; aggregate quality was still running.
Those observations do not certify this role increment.

## Next boundary

UserAccessService still uses persistence directly. IAM/public exports and current
consumers need review. D3.5 requires its own brainstorm/scope decision; Phase 11
has not started.
