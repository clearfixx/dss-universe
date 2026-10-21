# D3.3 — Owned recovery and verification attempt budgets

> Branch: `debt/d3-auth-identity-boundary`, draft PR #7.
> Status: recovery/verification Redis isolation implemented; login-abuse Redis remains.

## Ownership and preserved behavior

RecoveryRateLimit and VerificationRateLimit are separate private Auth capabilities.
Their scopes are closed string unions. Application services retain their policy
limits (request email/user 3, request IP 20, reset token 5, reset IP 30), mail
configuration checks, public errors and suppression behavior. Redis adapters own
key derivation and atomic increment/expiry, not user profiles or permission policy.
No generic Redis commands, Lua, keys or refresh-signing secret are passed through
the application contract. Raw rate-limit inputs stay inside Auth and are never
stored directly in Redis keys.

Adapters preserve the exact HMAC input, SHA-256 digest, key namespaces and existing
Lua script: increment once, set 900-second expiry only on the first attempt.
This is a fixed window, not sliding TTL. Existing budgets therefore survive the
refactor. Missing secret or Redis failure propagates; there is no in-memory or
allow-on-error fallback. Both request budgets are still evaluated concurrently.
No dependency, frontend, API/JWT, schema, migrations or worker changes.

## Evidence

- Direct API/DB/Redis run initially passed 92 suites / 451 tests without skips.
  After two service regressions were added, the full monorepo run with
  `--env-mode=loose --force` passed API 453 (all three opt-ins forwarded), Web 59
  and Worker 36, no cache. Reported API/typecheck wall times in that run were
  unusually long; do not interpret them as performance evidence or infer a cause.
- Six real Redis cases cover both adapters: 50 concurrent attempts yield exactly
  three winners at limit 3 and persist count 50 with TTL; existing shortened TTL
  is not extended; deterministic past expiry starts count 1 in a new window;
  identities and signing secrets remain separate. Final focused rerun passes all
  six tests (1.619 seconds). Only uniquely derived test keys are deleted; no flush.
- Twelve adapter unit cases characterize all six scope keys, exact Lua, boundary
  allowance/denial, missing-secret rejection and propagated Redis failures.
  Service regressions verify reset denial precedes hashing/consumption and failed
  verification accounting never enqueues delivery.
- Four selected real AppModule E2E pass (21 unselected), 7.81 seconds: recovery
  reset/revocation, verification/replay/audit, registration mail failure and actual
  BullMQ jobs. These prove DI wiring, not full E2E or SMTP acceptance.
- Final lint, typecheck and build pass. Prisma validation, architecture fixtures
  and frozen inventory pass; 144 known findings remain, no baseline edits.
- Changed-file formatting/diff checks pass. Root format
  retains 41 inherited deviations; full coverage/E2E/CI acceptance remains D6/D7.

CI for previous head `10a08ab`: Windows/Linux containment passed, dependency audit
and Web smoke failed, aggregate quality job concluded cancelled. These states do
not prove a cause or release acceptance; no red PR is merged.

## Remaining scope

LoginAbuseProtectionService still owns private Redis commands/Lua/key derivation.
Its identity/IP counters, milliseconds-based windows, repeated lock extension
and identity-only success reset require a separate capability transfer with real
Redis tests. This package does not claim D3.3 or broader D3.4 acceptance closed.
Phase 11 remains unstarted pending debt closure and the owner brainstorm.
