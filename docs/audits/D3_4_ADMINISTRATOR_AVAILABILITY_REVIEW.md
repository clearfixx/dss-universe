# D3.4 — Administrator availability acceptance review

Date: 2026-10-12. Source revision: `c9659e0`. Evidence-only review.

## Findings

DEBT-046 protects assignment count, not a usable administrator. Its adapter
counts `userRole` rows without filtering account eligibility. This remains
correct for the approved assignment-only contract, but cannot prove availability.

| Path                                      | Current source evidence                                                                                                                                                                          | Acceptance limit                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| IAM protected-role revocation             | `prisma-role-revocation.repository.ts` locks the role, counts holders and invokes application policy                                                                                             | Atomic assignment safety implemented; inactive holders still count                        |
| Self-deactivation                         | Auth GraphQL `deactivateAccount` requires authentication and password; Auth service delegates to its credentials repository, which changes ACTIVE to DEACTIVATED and revokes sessions atomically | No IAM/availability check; protected assignment remains after loss of eligibility         |
| Critical permission removal or key rename | IAM PermissionsService update/remove and RolesService revokePermission have existence checks, but no administrator-availability policy                                                           | A protected role can remain assigned while required management actions become unavailable |
| Users status change                       | UsersService.changeStatus persists status via Users repository; no production caller found by whole-source search                                                                                | Latent ownership inconsistency, not evidence of an exposed status endpoint                |

PermissionsGuard checks effective permission keys; it does not grant blanket
permission bypass to the name `admin`. Permission changes therefore matter even
when a protected role assignment remains. Existing same-token authorization E2E
tests characterize ordinary permission revocation, not safe administrator recovery.

These are static call-path findings, not a reproduced total lockout or production
incident. Self-reactivation exists; deactivation alone is not necessarily
irreversible. Raw database writes, password loss, provider outages and future
moderation routes are outside any claimed guarantee.

## Decision needed (DEBT-047)

Before implementation, agree the minimum recoverable administrative capability
set and whether one subject must hold the whole set. Role names alone are not
sufficient. Recommend one ACTIVE subject with the complete agreed recovery set,
and atomic protection for application commands that would remove the final such
subject. Do not make Auth import IAM repositories or inspect roles itself.

Root composition should coordinate narrow owner contracts; Auth owns eligibility,
IAM owns assignments and Authorization evaluates effective capabilities. Choose a
shared serialization boundary covering deactivation, revocation and permission
mutation; separate per-role locks cannot protect every cross-owner race.

Required tests: isolated real DB fixtures, two concurrent destructive commands,
cross-owner deactivation versus revocation, direct/role permission overlap,
permission rename/delete, successful non-final changes, denial rollback and
existing API response compatibility. No global seed mutation or role-name bypass.

No runtime code, schema or tests changed in this review. D3 remains unaccepted;
D3.5 and Phase 11 have not started. Any corrective implementation needs separate
scope approval. Existing root quality/CI debts remain independent blockers.
