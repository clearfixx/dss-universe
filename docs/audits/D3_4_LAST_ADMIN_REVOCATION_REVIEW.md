# D3.4 — Last privileged role-holder revocation review

> Reviewed revision: `a9c5596`.
> Status: DEBT-046 OPEN; owner approved a separate corrective package.
> This report does not claim a production incident or implemented correction.

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
