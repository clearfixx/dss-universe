# D3.3 — Login-abuse transaction boundary

> Branch: `debt/d3-auth-identity-boundary`, draft PR #7.
> Status: durable login-attempt increment implemented; D3.3 remains open.

## Ownership and preserved behavior

LoginAbuseProtectionService no longer imports PrismaService or the concrete audit
writer. It applies the existing configured policy, identity/IP Redis limits and
post-commit alert orchestration. An Auth-owned LoginAbuseRepository contract
accepts only subject ID, failure-limit/lock-duration policy and allowlisted audit
context; it exposes no ORM records, transaction clients or profile aggregates.

PrismaLoginAbuseRepository owns the existing row lock, authoritative counter read,
counter/lock update and transactional audit. It returns only `{ email }` when the
existing first-lock transition commits. SQL failure cannot return a destination;
the application therefore cannot send a misleading lock alert after rollback.
Unknown accounts still receive Redis counters without account writes or alerts.
Successful login clears only identity Redis counters and delegates SQL reset/audit.

This transfer does not redesign lock policy: existing attempts increment under a
row lock, locking begins at the configured threshold, and further failed attempts
extend the SQL lock. Audit/alert happens only when the previous lock value is null;
an expired-but-non-null value retains that historical behavior. No new positive
security cache, weakened threshold, fail-open fallback or notification policy is
introduced. Redis and PostgreSQL are not a distributed transaction: Redis changes
may remain when SQL fails, just as before. Public errors and JWT shape are preserved.

## Runtime recovery

The first DB run found PostgreSQL port 5434 unavailable because Docker Engine was
not running (six DB tests failed to connect, seven application tests passed).
Docker Desktop was started, existing `dss-test` services restarted and all 52
migrations plus seed applied to the now-empty disposable tmpfs database only.
No dev/production database reset occurred and no new migration was authored.

Dev PostgreSQL, Redis, Mailpit and ClamAV subsequently report healthy. Optional
OTLP collector was exited after engine shutdown and was restarted without config
changes; container startup is not evidence of end-to-end telemetry delivery.

## Verification

- Full API units with `RUN_AUTH_DB_TESTS=1` and `RUN_RECOVERY_DB_TESTS=1`:
  84 suites / 392 tests passed, no skips, 32.421 seconds.
- Six real isolated PostgreSQL login tests prove serialized concurrent failures
  without lost increments, a single lock destination, no duplicate transition,
  missing-account denial, success reset and rollback of both failure/success
  transitions when audit fails. Mocked audit failure triggers real SQL rollback;
  it is not represented as an audit-platform integration test.
- Four selected real HTTP/GraphQL E2E pass / eighteen unselected skipped,
  23.221 seconds. New REST case proves SQL lock/audit, 429 despite valid password,
  one notification and success reset. Recovery/revocation, profile allowlist and
  GraphQL registration/viewer regression cases also pass.
- Lint and typecheck: nine successful tasks each, API fresh / eight cached.
- Build: six successful tasks, API fresh / five cached. Prisma validation passes.
  The cached Web build is not a fresh UI/browser acceptance claim.
- Architecture checks and 28 analyzer fixtures pass. One manually reviewed
  application-persistence finding removed, no added finding; frozen inventory
  matches 146 remaining debts. This is not a compliance certificate.
- Generated GraphQL schema has no diff; no frontend/dependency/schema changes.
- Changed-file formatting and `git diff --check` pass. Root `format:check`
  remains red on 41 previously known files; unrelated files were not reformatted.

Run the login DB suite with the explicit opt-in flag against the disposable DB.
It creates and drops only a UUID-named isolated schema. Ordinary unit runs skip
this DB suite by design; do not confuse their counts with the full opt-in run.
No real account-lock email is delivered by the new HTTP assertion.

## Remaining work

D3.3 still includes email verification, 2FA and Redis/queue capability review.
Then D3.4 reconciles security/IAM ownership; D3.5 remains separately scoped.
Existing dependency audit, Web smoke, full E2E lifecycle, formatting and TOTP
test nondeterminism remain debts. No merge or Phase 11 implementation is authorized
by the focused passing checks; stop for the agreed Phase 11 brainstorm.
