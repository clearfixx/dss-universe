# D3.3 — Second-factor persistence boundary

> Branch: `debt/d3-auth-identity-boundary`, draft PR #7.
> Status: persistence transfer implemented; infrastructure review remains open.

## Ownership and preserved semantics

TwoFactorService now uses a private Auth-owned TwoFactorRepository. No Prisma,
concrete audit writer, Users profile or transaction client crosses that boundary.
Application owns encryption, TOTP verification, recovery generation/hashing and
existing public errors. Infrastructure owns minimal credential reads, row locks,
setup writes, recovery consumption, disable/revocation/version writes and audit.
Status returns only enabled/count; password reads select only passwordHash and
login reads only enabledAt/encryptedSecret, not whole account/credential records.

Confirmation passes a synchronous pure verifier of the encrypted secret. The
adapter invokes it after its authoritative locked read, before writing hashes and
audit. No ORM object escapes through the callback. Plaintext recovery codes return
only after commit. All imports/exports are explicit and new sources have Passports.
No dependency, frontend, migration, generated GraphQL schema or JWT change.

This package preserves—not certifies—the existing first-row setup lock and split
disable-proof transaction boundaries. DEBT-042 records those concurrency concerns
and has owner agreement for a separate D3.4 corrective package. Recovery proof may
already be consumed if the later disable transaction fails; the passing disable
rollback test applies to its own delete/revoke/version transaction only. There is
no claim of atomic proof-plus-disable or complete lifecycle race safety.

## Verification

- Full API unit run with `RUN_AUTH_DB_TESTS=1`, `RUN_RECOVERY_DB_TESTS=1`:
  86 suites / 415 tests passed, no skips, 18.907 seconds.
- Ten application tests cover owned-port delegation, setup, pure verifier/hash
  arguments, missing/invalid proof, recovery denial, storage failure, password
  gating and failure without returning recovery plaintext.
- Nine isolated PostgreSQL tests cover status, pending replacement/enabled refusal,
  serialized confirmation, invalid/missing setup, one-use concurrent recovery,
  preservation of unrelated hashes, disable/revocation/version and audit-failure
  rollback. Audit is mocked in these tests; SQL transactions/locks are real.
- Four selected real AppModule E2E pass / twenty unselected skipped, 9.562 seconds.
  New GraphQL setup/confirm/disable and REST login prove real TOTP, encrypted
  storage, hashed recovery codes, one-use recovery, actual audit rows and old-token
  401 after disabling. Existing verification/recovery/lock regressions pass.
- Prisma validation, architecture checks and 28 analyzer fixtures pass. Reviewed
  frozen inventory is 144 findings, one removed, none added; debt is not waived.
- Final lint and typecheck pass nine tasks each (API fresh, eight cached).
  Build passes six tasks (API fresh, five cached); cached Web logs do not imply
  fresh browser acceptance. Root formatting remains red on 41 known unrelated
  files. Changed-file formatting and `git diff --check` pass.

The first lint run found one unsafe Jest asymmetric matcher assignment in a test;
it was replaced by separate typed assertions, without rule suppression.

## Remaining work

Redis/queue capability review remains D3.3 work, then D3.4 integration/acceptance.
DEBT-042 is not fixed by relocating code. D3.5 is separately scoped. Known root
formatting, dependency audit, Web smoke and complete E2E lifecycle debts remain.
Focused results are not a release gate, merge approval or Phase 11 authorization.
