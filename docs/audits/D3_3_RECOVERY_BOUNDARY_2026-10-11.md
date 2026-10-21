# D3.3 — Password recovery persistence boundary

> Branch: `debt/d3-auth-identity-boundary`, draft PR #7.
> Status: recovery increment implemented; auxiliary boundary work remains open.

## Change and ownership

PasswordRecoveryService consumes an Auth-owned PasswordResetRepository contract,
not a concrete Prisma adapter or database client. The adapter binds privately in
AuthModule. The public API still returns only `{ success: true }`; there is no
new endpoint, schema, profile dependency or migration.

The old service read an email via a separate pre-consumption Prisma query. The
adapter now returns only `{ email }` from the locked authoritative account after
the reset transaction commits. Missing, expired, consumed, inactive or version-
invalid credentials return null. The application sends a recovery alert only
after successful consumption; rollback never triggers that alert. No hashes,
Prisma records or transaction handles return through the contract.

The existing row lock, token deletion, password/version update, lockout reset,
session revocation and audit remain in one database transaction. Reads now select
only userId/authVersion for the reset candidate and id/email/status/authVersion
for the account. Post-commit mail remains best-effort through the existing alert
service. Public request rate limiting and non-enumeration behavior are unchanged.

This is not full D3.3 completion: login-abuse, email verification and 2FA still
have application persistence dependencies. Redis/queue and audit integration
also need review. Existing DEBT-040/041 are not silently repaired here.

## Verification

- Full API unit run with `RUN_RECOVERY_DB_TESTS=1`: 83 suites / 382 tests pass,
  no skips, 15.710 seconds. Includes eight isolated real PostgreSQL reset tests:
  concurrent single consumption, expiry/version denial, transactional audit
  rollback, three inactive account states, current email and unknown token.
- Targeted real AppModule E2E: three pass / eighteen unselected skipped,
  10.718 seconds. The new GraphQL reset test proves old-token 401, successful login
  with the new password, replay denial, one notification and consumed token removal.
  Existing REST allowlist and GraphQL registration/viewer cases also pass.
- Lint/typecheck: nine tasks successful each; API fresh / eight cached.
- Build: six tasks successful; API fresh / five cached. No claim of fresh Web build.
- Prisma schema validation passes. Generated GraphQL schema has no diff.
- Architecture checks and 28 analyzer fixtures pass. One manually reviewed
  persistence finding is removed; no new findings. Frozen inventory is 147,
  not an architectural compliance certificate.
- Full release gate is not green: known dependency audit, Web smoke, full E2E
  lifecycle, formatting and nondeterministic TOTP-test debts remain open.
- Repository-wide format check reproduces the same 41 failing files. Changed-file
  Prettier checks and `git diff --check` pass; no unrelated bulk cleanup is included.

The opt-in PostgreSQL suite creates and removes only its unique isolated schema
in the disposable test database. Test credentials are synthetic; no production
data or real email delivery is involved in the new GraphQL assertion.

## Next

Continue D3.3 with login-abuse persistence, email verification and 2FA contracts,
preserving transaction/race guards and public behavior. Then D3.4 and separately
scoped D3.5. Stop before Phase 11 for the agreed product/implementation brainstorm.
