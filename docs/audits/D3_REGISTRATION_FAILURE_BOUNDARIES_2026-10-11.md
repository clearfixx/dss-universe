# D3.2 registration failure characterization

Date: 2026-10-11. Scope: required pre-composition failure tests, not completion
of registration ownership transfer.

## Contract established against PostgreSQL

1. A conflicting username rejects account creation and leaves no account for the
   new email. The original account, baseline role and session are retained.
2. Failure after the default-role SQL insert rolls back both account and role.
   A test-only Prisma query extension executes the real insert, then throws
   inside the real interactive transaction. It does not emulate rollback with
   in-memory mocks or alter database schema. No account, assignment or session
   survives. The extension is local to the repository instance under test.
3. Session persistence failure occurs after the account/profile/default-role
   transaction commits. Registration rejects without returning an auth response.
   Even a token captured internally after signing is rejected by the real HTTP
   authentication guard because its session does not exist. Account and role
   remain; a later normal login succeeds. This is not full-registration rollback.
4. Verification-mail enqueue failure remains best-effort: REST registration
   returns its normal response, an unverified account and session remain, and
   its access token works. Queue failure is actually injected; configuration
   is enabled for this test rather than letting an unconfigured no-op pass.

Spies are restored in finally blocks. Test identities are unique synthetic
values in the disposable test database. No production behavior, dependencies,
schema or UI is changed.

## Remaining implementation

Move orchestration outside Auth and Users applications using explicit owner
commands and a composition-owned transaction contract. The current Users
repository transaction is characterization evidence, not the desired final
owner. The composition adapter must keep account/profile/default-role atomic
without exposing a Prisma client through application ports. Preserve the
post-commit session and best-effort mail boundaries above. Legacy profile/token
presentation is separately still pending. D3.2 and overall acceptance remain open.

## Local verification

- Eleven selected API E2E passed, nine unselected tests skipped (18.929 seconds).
  This includes the four new cases and the previous seven Auth boundary cases.
- Full API unit suite: 341 passed, three skipped; 76 suites passed, one skipped.
- Lint and typecheck: nine successful tasks each (API fresh, eight cached).
- Build: six successful tasks (API fresh, five cached).
- Prisma validation, 28 architecture analyzer fixtures and the unchanged
  155-finding inventory check pass. Findings remain debt, not a waiver.
- Changed-file formatting passes. Repository-wide formatting remains a separate
  existing debt; this package does not perform a bulk cleanup.

These results do not replace full E2E/CI acceptance or close the known dependency
audit and Web smoke defects.

## CI observation before this increment

On d88675a, Quality Gate run 38143645738 has failing Dependency audit and Web
smoke, with the main quality job pending at observation. Storage containment
run 38143645766 passes Ubuntu and Windows. These are not results for the new
test increment and do not justify merging the draft PR.
