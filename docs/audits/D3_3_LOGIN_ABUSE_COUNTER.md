# D3.3 — Owned login-abuse counter

> Branch: `debt/d3-auth-identity-boundary`, draft PR #7.
> Status: login Redis capability isolated; broader D3 acceptance remains open.

## Ownership and compatibility

LoginAbuseProtectionService now consumes the private LoginAbuseCounter capability.
Application code retains configured identity/IP thresholds, millisecond policy,
SQL ordering and post-commit alerts. The infrastructure adapter alone owns Redis
commands, Lua and HMAC key derivation. The capability is not publicly exported.

Existing namespaces and signing-secret inputs are unchanged. Each Lua invocation
atomically increments one scope's counter and sets its expiry only on the first
failure. Failures at or above the threshold renew the block TTL, not the counter
TTL. Successful login clears only the identity's two keys; IP state remains.
Redis errors propagate and prevent the subsequent SQL transition. This preserves
existing behavior, not a distributed Redis/Postgres transaction: identity/IP writes
and the two success deletions are still separate operations.

No frontend, public API/JWT, dependencies, schema, migrations or worker changes.
Production Auth application sources no longer import Redis clients/connections,
QueueRegistry or Prisma directly. This does not certify all module boundaries.

## Verification

- Uncached monorepo unit run with `--env-mode=loose --force` and all three DB/Redis
  opt-ins passed: API 94 suites / 465 tests, Web 59, Worker 36. API took 61.275s;
  no API tests were skipped.
- Five real Redis cases cover parallel identity/IP increments without lost
  updates, exact threshold behavior, renewed block versus fixed counter expiry,
  independent expiry and identity-only reset. Cleanup deletes only unique keys
  owned by these tests; no database flush.
- Five adapter unit cases cover compatible private keys, policy units, scoped
  reset, missing secret and propagated errors. Two additional application tests
  cover failed block reads and reset failure preventing durable success writes.
- Four selected real AppModule E2E passed (21 unselected), 17.161s: failed-login
  lock, second-factor rollback/retry, password recovery and persisted BullMQ jobs.
  The synthetic audit failure in output is an intentional rollback assertion.
- Lint, typecheck, Prisma validation and build passed. Unchanged packages may use
  Turbo cache in these gates; the full unit run bypassed cache.
- Architecture fixtures passed; frozen inventory remains 144 known findings,
  with no baseline edits. These are unclosed debt, not waived violations.
- Changed-file formatting and whitespace checks pass. Root `format:check`
  still reports 41 inherited files; they were not reformatted in this package.

CI observed on prior head `961bd83`: Windows/Linux containment passed, dependency
audit and Web smoke failed, aggregate quality job was still running. This is not
CI acceptance for the current increment; no merge is performed.

Full release acceptance, inherited root formatting and full E2E/CI remain separate
D6/D7 work. The next D3 review covers IAM/public contracts and final boundary
acceptance; generic groups/Premium implementation remains D3.5, not implicit scope.
