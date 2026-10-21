# D3.4 — Last privileged role-holder revocation review

> Reviewed revision: `a9c5596`.
> Status: DEBT-046 implemented; review and broader D3 acceptance pending.
> The original review below remains historical evidence, not a production incident.

## Implemented correction and verification

UserAccessService now delegates revocation to private RoleRevocationRepository,
passing the existing IamSafetyService policy as a synchronous callback. The
Prisma adapter validates subject existence, locks the role row, reloads its name
and assignment, counts holders, invokes policy and deletes in one explicit
READ COMMITTED transaction. The policy returns `undefined`, not `void`, so an
accidental asynchronous callback does not satisfy its TypeScript contract.
Policy/storage errors roll back. Only scalar safety
state crosses the port; no ORM client, profile or credentials do. The capability
and adapter are not exported from IAM. Existing successful summaries and missing
entity/assignment errors are preserved. Sole protected-holder removal now denies
with HTTP 400. No migration, schema, dependencies or frontend changes are needed.

- Ten application regressions pass: normalized protected names, remaining/ordinary
  holders, compatible missing outcomes and persistence failure propagation.
- Seven real DB regressions pass in an owned random schema: sole admin and
  super_admin denial, competing removals for both roles, ordinary final removal,
  missing outcomes and rollback after an AFTER DELETE trigger raises an error.
- Both concurrency tests hold the actual role row externally, start two
  revocations and observe both PostgreSQL transactions waiting on locks through
  pg_stat_activity before release. One succeeds, one gets the policy error, one
  holder remains. Polling waits for observed state; elapsed sleep is not proof.
- Final focused service/DB rerun: 17 pass, 1.834 seconds, including the tightened
  synchronous policy contract.
- Seven real authorization HTTP/GraphQL E2E pass; final rerun 14.24 seconds.
  Two new cases
  use uniquely owned whitespace-suffixed protected names and verify 400 for the
  sole holder, successful compatible removal with two holders, missing assignment
  404 and persistence of the remaining holder. Shared seeded admin roles are not
  touched. Earlier same-token grant/revoke and fail-closed regressions still pass.
- Full uncached units with Auth/recovery/Redis/IAM opt-ins: API 101 suites / 513
  tests, Web 59, Worker 36 pass. API duration 38.532 seconds. The later lint-only
  fixture fixes were covered by the final focused rerun.
- Monorepo lint, typecheck, Prisma validation and build pass. Architecture's 28
  fixtures, legacy subset, editor license check and baseline pass: 141 known
  findings, no inventory changes. Changed-file formatting/whitespace checks pass.
- Root format remains red on 41 inherited files. Full API E2E was not rerun;
  DEBT-045's earlier 44/46 result and open-handle/cleanup failures remain open.
  Dependency audit, GraphQL generation consistency, Web smoke and required CI
  acceptance are not waived. This correction is not full D3 completion or merge
  approval.

The general UserAccess persistence transfer remains unfinished. It must reuse or
integrate this capability without duplicating the safety-critical revocation path.

## Evidence

UserAccessService.revokeRole checks subject, role and assignment existence, deletes
the assignment and returns a refreshed summary. It does not count remaining role
holders or call IamSafetyService.assertLastAdminRoleIsNotRemoved. Repository-wide
search finds that safety method only in its definition and unit tests. The HTTP
endpoint does require `roles.update`; this is not an unauthenticated bypass.

A temporary isolated Jest probe instantiated the unchanged service with a
controlled persistence double containing one assignment and a count of one.
For each of `admin` and `super_admin`, the probe expected BadRequestException.
Both assertions failed: the promise resolved with an empty role/permission
summary. The command was:

```text
pnpm --filter @dss/api test:unit --testPathPatterns=last-admin-review.spec
```

Result: one suite failed, two tests failed, 0.948 seconds. No database was used
or changed. The temporary diagnostic source was removed after evidence capture;
it is not a skipped acceptance test or a claim that the gate passed. The approved
correction must add permanent service, real database and HTTP regressions.

## Approved corrective scope

The owner approved an independent D3.4 security increment: atomic role-holder
count/check/removal under a role lock, deterministic concurrency tests and HTTP
regressions, preserving successful response shapes. Protect each of `admin` and
`super_admin` according to the existing normalized-name policy. Missing entities
and assignments retain their established errors. No new frontend or migrations
are required by this decision.

The application service retains the safety decision. A private IAM persistence
capability owns the transaction and lock; no Prisma record or transaction client
crosses the port. Load current role identity and assignment state after obtaining
the shared role lock. Count and deletion must run in that same transaction. A
policy denial or storage failure must leave the assignment unchanged.

Do not place a count query before a separate delete: with two holders, two
requests can both observe two and remove both. Lock by role, not only subject,
because the competing removals can target different subjects. Permanent tests
must use explicit lock barriers, not sleep-based guesses, and prove one holder
survives competing revocations.

## Explicit limits and follow-up acceptance

A surviving role assignment is not proof of an operational administrator.
Account deactivation/deletion, credential eligibility, stripping critical role
permissions and direct grants are distinct paths requiring broader acceptance
review. Do not silently redefine this package as guaranteeing that the site always
has a usable administrator. Conversely, do not treat this narrower correction as
closing that broader concern. Registration and Auth must not start owning IAM
assignments as a workaround.

The ordinary UserAccess persistence transfer remains unfinished and must be
coordinated with this private capability, avoiding duplicate repository surfaces.
D3, D3.5 and Phase 11 acceptance remain open. Required CI must be green before
merge; no quality gate is waived by the owner scope approval.
