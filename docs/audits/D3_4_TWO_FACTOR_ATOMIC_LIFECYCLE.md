# D3.4 — Atomic second-factor lifecycle (DEBT-042)

## Scope and decision

Owner-approved corrective package, separate from the D3.3 persistence transfer.
Auth retains credential ownership; pure verification callbacks cross the private
port, never Prisma clients or profile data. No schema, migrations, dependencies,
frontend, transport fields or routes change. Existing pending-setup cancellation
with a valid password remains supported.

## Implementation

Begin, confirm, recovery consumption and disable lock the existing subject row
before reading factor state. Unlike a factor-row lock, this serializes first
setup when no factor exists. Disable reads the current password hash and checks
the password inside that transaction, then verifies the current enabled secret
or recovery hash. Recovery-use audit, deletion, session revocation, auth-version
increment and disabled audit commit together. Audit failure restores all state,
including the recovery code. Crypto and password policy remain in application
services; persistence receives narrow verification functions.

The lock order is subject then factor. Password comparison holds a database lock;
keep verifiers local and bounded, without network calls. This package does not
claim serialization of every account lifecycle operation or redesign login.

## Evidence

- API unit/isolated PostgreSQL tests pass directly with both DB flags enabled:
  87 suites, 425 tests, no skips (56.21 seconds).
- DB barriers prove absent-factor setup waits on the subject, setup waits behind
  disable, password verification observes a committed replacement after waiting,
  and confirmation cannot re-enable a deleted setup. Waiter observation is scoped
  to this test pool's unique PostgreSQL application name, not elapsed-time guesses.
- Concurrent TOTP disables have one successful mutation/audit. Invalid proofs do
  not mutate state; recovery-based disable audit failure restores the code.
- Selected real GraphQL/REST E2E passes: injected disable audit failure preserves
  the code and authenticated session; retry with that same recovery code succeeds
  and immediately revokes the session. One case passed, 23 intentionally unselected.
- Monorepo units pass: Web 59, Worker 36, API 391 ordinary tests. Turbo strict env
  omits the optional DB flags (34 tests skipped), so this is not DB evidence;
  the separate direct API command is mandatory.
- Typecheck, lint, Prisma validation, build and architecture gates pass. Production
  API builds fresh; unchanged package builds may use Turbo cache. Inventory stays
  at 144 known findings, not waived or edited by this package.
- Root format check remains red on 41 pre-existing files, outside this package.
  Changed files must pass separately. Full E2E/coverage/CI acceptance remains open
  under the existing D6/D7 work; no green release or merge is claimed.

## Remaining work

D3.3 recovery/verification queue and Redis capability isolation remains open.
D3.4 broader IAM/account-state acceptance is not closed by this correction.
Phase 11 remains blocked on the debt sequence and owner brainstorm.
