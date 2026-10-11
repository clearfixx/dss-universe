# D3.2 — Field and Operation Ownership Inventory

> Inspected: 2026-10-11, after D3.1 commit `b052710`.
> Implementation prerequisite under ADR-003, not a claim of completed isolation.

## Observed physical state

`users` currently combines credentials, eligibility, profile and relation keys.
`username` and `passwordHash` are required; email and username are unique.
There is no independent nullable profile row. Creating an Auth subject followed
by a profile with two independent commits is therefore not a valid migration.
The approved shared physical DB is retained; no schema migration is implied.

## Scalar ownership

| Fields                                                  | Logical owner                     | Permitted boundary                                                   |
| ------------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------- |
| `id`                                                    | Stable opaque subject identity    | ID only across features; preserve existing IDs                       |
| `email`, `passwordHash`                                 | Auth credentials/delivery         | Hash remains Auth-private; email in explicit viewer presentation     |
| `status`, `deactivatedAt`, `authVersion`                | Authoritative account eligibility | Auth-owned commands/read models, coordinated IAM transitions         |
| `loginFailedAttempts`, `loginLockedUntil`               | Auth abuse protection             | No profile response; D3.3 persistence port                           |
| `refreshTokenHash`                                      | Legacy Auth credential            | Private transitional storage; sessions are current refresh authority |
| `emailVerifiedAt`                                       | Auth verification fact            | Safe verification timestamp may be composed into viewer              |
| `username`, `displayName`, `bio`, `location`, `website` | Users profile                     | Explicit profile operations/view                                     |
| `technologies`, `interests`, `avatarUrl`, `coverUrl`    | Users profile                     | Explicit profile view, current transport preserved                   |
| `avatarMediaId`, `coverMediaId`                         | Users attachment links            | Internal relation keys; Media owns binary lifecycle                  |
| `lastSeenAt`                                            | Users presence                    | Existing visibility/response policy, not login eligibility           |
| `createdAt`, `updatedAt`                                | Shared-row storage metadata       | Existing safe presentation timestamps; no ownership split invented   |

Relations are not an invitation to load joined aggregates. Sessions, password
reset, email verification and two-factor authenticators belong to Auth; role and
permission assignments belong to IAM. Social links, privacy, follow/block and
profile-wall data belong to their existing Users capabilities. Content, Media,
progression and interaction relations remain owned by their respective features.

## Operation migration map

| Current operation                                                        | Target responsibility                                                                               | Preservation requirement                                                                       |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `AuthService.register` → `UsersRepository.create`                        | Named registration composition using owned commands and composition-owned unit of work              | Atomic identity/profile/default-role creation; no session for incomplete state                 |
| `AuthService.login` / `reactivateAccount`                                | Auth credential/eligibility port and authenticators                                                 | Normalize email, dummy hash path, abuse limits, 2FA and denial behavior                        |
| `AuthService.refresh`                                                    | Auth account state and session rotation                                                             | Session ownership, active status, version and refresh hash checks                              |
| Deactivate / reactivate / email / password mutations in Users repository | Auth-owned credential/account-state adapter                                                         | Transactional revocation, version increments, audit and alert semantics                        |
| `AuthService` result `user` via foreign `UserMapper`                     | Presentation composition over safe profile contract                                                 | Same supported REST/GraphQL profile fields; no ORM or hashes                                   |
| Auth resolver imports foreign GraphQL mapper/model                       | Combined models/mapping in presentation composition                                                 | Same schema names/fields and operation names                                                   |
| Token signing reads `TokenUser.username` and concrete PermissionsService | Narrow token-issuance/authorization capabilities with composition adapter for legacy display claims | Preserve current token/request-context compatibility without adding profile aggregates to Auth |

These are targets, not new universal facades. Core must not import feature modules.
Ports cannot expose Prisma transactions or whole `UserRecord` values. Cross-owner
adapters are wired at an explicitly named composition root. Do not replace
private imports with public exports of the same broad repository.

## Registration and failure characterization still required

The dedicated credential/account-state writes in the migration map are now
Auth-owned commands; see [command-transfer evidence](../audits/D3_ACCOUNT_CREDENTIAL_COMMANDS_2026-10-11.md).
The unused legacy Users refresh-hash update operation is removed. Credential
reads, registration, token display claims and presentation composition still need
migration; this is not completion of the entire map.

Current `PrismaUsersRepository.create` transaction creates the row and default
`user` role assignment. Session creation happens later. Email verification enqueue
is deliberately best-effort. Preserve that distinction: failure before account
commit rolls back account/profile/assignment; failure to issue/persist a session
must not return usable credentials, but must not be misrepresented as proof the
already committed account disappeared. Add explicit failure-injection tests.

Before removing existing repository operations, identify all callers and preserve
state-transition race guards. Merely testing a successful login is insufficient.

## Implemented first: safe profile allowlist

The existing mapper removed two hashes then spread all remaining runtime fields.
Three new regression tests failed on the original code: internal eligibility/
lockout fields and arbitrary future secrets crossed the boundary despite the
`SafeUser` return annotation. It now copies exactly the existing 16 declared
`SafeUser` fields. REST register/login/refresh are verified with exact key checks;
GraphQL profile shape is unchanged.

This intentionally removes undeclared REST extras such as `authVersion`,
`deactivatedAt`, lockout state and attachment relation IDs. They were not part of
the declared safe contract and no Web consumer reference was found. This is a
security-boundary correction, not a claim of byte-for-byte accidental-field
compatibility. It does not yet remove Auth's dependency on the Users mapper.

Full D3.2 remains open until the operation migration and its failure/security
tests above are implemented. D3.3/D3.4 and D3.5 remain separately tracked.
