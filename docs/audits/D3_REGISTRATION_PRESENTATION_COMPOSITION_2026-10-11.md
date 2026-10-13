# D3.2 — Registration and profile presentation transfer

> Branch: `debt/d3-auth-identity-boundary`, stacked PR #7.
> Status: implementation transferred; overall D3 and release acceptance remain open.

## Ownership and compatibility

AuthService no longer imports UsersRepository, UserMapper, profile DTOs or ORM
types. AuthenticationFlows returns opaque subjectId and token pairs, never a
profile. Auth owns email normalization, uniqueness checks, hashing, eligibility,
2FA, abuse controls, sessions and token issuance. Auxiliary persistence access in
abuse controls remains for D3.3; removing profile imports is not full compliance.

AuthenticationPresentationService lives at the root composition layer, not inside
Auth or Users. It binds registration profile input, calls Auth enrollment and
post-commit completion, then loads a Users-owned sixteen-field viewer projection.
The response separately allowlists profile and token fields and denies a profile
for a different subject. Missing or failed presentation returns no combined success.

PrismaRegistrationTransaction implements the narrow trusted write-only
CredentialSubjectStore for a bound profile. It receives normalized email/password
hash only for persistence and returns only the new subject ID. No hash is returned
as a business result, event or profile. No Prisma transaction/client crosses an
application port. The shared physical row is retained under ADR-003; there is no
DDL, duplicate identity or new universal service facade.

The identity/profile row and IAM-owned `user` baseline assignment commit together.
UsersRepository.create and its unused credential-bearing CreateUserContract are
removed. Session creation follows commit; verification mail is still best-effort.
An account is not rolled back when post-commit session creation fails. Tokens
minted without a persisted session fail protected endpoints, as the real E2E proves.

The existing three REST routes and four combined GraphQL mutations, input/model
names, supported viewer fields and token formats are preserved. Combined models,
registration inputs and transport adapters move to IdentityPresentationModule.
Users publishes its viewer model/mapping; Auth publishes its owned login/refresh
transport. The root wires modules without an Auth/composition import cycle.
The generated GraphQL schema has no diff. No frontend/dependency/schema changes.

## Failure limits, not a distributed transaction

The profile read follows Auth completion. Failure cannot return tokens to the
caller, but does not undo a committed account, newly persisted session or refresh
rotation. An unreachable session remains until expiry/revocation; a rotated refresh
may require a fresh login if presentation fails. This is explicitly not atomic
across presentation or a promised refresh retry protocol. Refresh retains uniform
invalid-credentials denial; other infrastructure failures preserve failure rather
than inventing a successful profile. These cases have composition unit tests.

REST DTO imports already used type-only symbols before this transfer. Reflection
now confirms `Function` rather than DTO constructors for body parameters. This
pre-existing validation gap is DEBT-040, not a waived security policy. Required/
optional field decisions and behavior correction need a separate reviewed package.

## Verification

- API unit coverage: sequential rerun passes 82 suites / 373 tests, with one suite
  / three tests skipped, 20.238 seconds. Existing per-service thresholds pass and
  are unchanged; repository-wide coverage is not claimed to meet those service
  thresholds. The preceding failures below remain part of the evidence.
- Real API E2E: final rerun 11 selected passed / 9 unselected skipped, 17.543 seconds. Includes
  registration uniqueness, real SQL rollback after role assignment, post-commit
  session denial, best-effort mail, account-state guards, exact REST profile/JWT
  keys, GraphQL registration/viewer/reactivation, credential rotation and sessions.
- Lint/typecheck: nine successful tasks each, API fresh / eight cached.
- Build: six successful tasks, API fresh / five cached. Cached Web output is not
  a fresh browser/Web acceptance claim.
- Prisma validation passes; no migrations or seed changes.
- Architecture checks and 28 analyzer fixtures pass. Seven reviewed findings are
  manually removed: two Auth foreign concrete mapper imports, four private Users
  imports and the SafeUser Prisma dependency. No added findings. Frozen inventory
  matches 148 remaining debts, not an architecture compliance certificate.
- Repository formatting still reports the same 41 files; no unrelated cleanup.
- Default parallel API coverage exhausted local memory while other gates ran.
  Retry uses `--runInBand`; DEBT-035 records the resource policy issue.
- The first sequential coverage run then hit the unchanged random TOTP tamper
  assertion (DEBT-041): 372 passed / 1 failed / 3 skipped. It sometimes replaces
  an existing `x` with itself. A clean rerun does not close that separate test debt.
- Earlier-head CI `38144900568`: dependency audit and Web smoke fail; the main
  quality job is still in progress at observation. Storage `38144900607` passes
  on Windows/Ubuntu. These observations do not certify the unpublished transfer.

Unit tests cover normalized write-only enrollment, duplicate/store/eligibility
denials, session-before-mail ordering, owner/transport allowlists, missing/wrong
profiles, infrastructure failure, IAM baseline selection and exact safe SQL reads.
Mocked transaction failure propagation is not passed off as SQL rollback evidence;
the selected real database E2E tests establish actual rollback.

## Next

D3.3 auxiliary Auth boundaries, then D3.4 security/IAM reconciliation. Separately
scope D3.5 groups/Premium with the owner. Existing red dependency audit, Web smoke,
full E2E lifecycle and formatting debts remain open. Do not merge this draft PR
or start Phase 11 before the agreed debt gates and product brainstorm.
