# D3.3 — Recovery and verification delivery capabilities

> Branch: `debt/d3-auth-identity-boundary`, draft PR #7.
> Scope: queue boundaries only; Redis isolation and overall D3 acceptance remain open.

## Ownership and compatibility

PasswordRecoveryService and EmailVerificationService consume separate private
Auth-owned enqueue contracts. BullMQ adapters alone receive QueueRegistryService;
no application service in Auth now imports that registry. Contracts retain the
existing versioned jobs from `@dss/jobs`, with no feature-private imports or new
public barrel exports. Runtime payloads are reconstructed field by field.

Both queues preserve three attempts, exponential 5000ms backoff, removal on
completion/failure and existing job names. Recovery includes only email and
requestedAt; verification adds opaque userId. The application still owns time,
email normalization, configuration checks and failure policy. Recovery requests
enqueue unknown addresses without account lookup. Explicit resend/recovery queue
failure propagates; registration verification remains best-effort after commit.
No token, password, profile or arbitrary future field is forwarded to delivery.

The queues skill informed retry/failure boundary review; the approved BullMQ
stack, worker contract and retention policy are retained. This is not a provider
migration, transactional Outbox, exactly-once claim or SMTP delivery guarantee.
No migrations, schema, JWT, dependencies or frontend changes.

## Verification

- Direct full API units with both DB flags: 89 suites / 433 tests pass, no skips,
  27.968 seconds. Six new adapter tests cover exact options, runtime allowlisting
  and error propagation; two new service tests prove failure policy differences.
- Full monorepo units rerun without cache using `--env-mode=loose --force`:
  API 433 (all DB opt-ins forwarded, no skips), Web 59 and Worker 36 pass;
  six tasks fresh, 53.293 seconds. Loose mode here is an explicit local test
  invocation, not a configuration change or permission to cache DB opt-ins.
- Four selected real AppModule E2E pass, 21 unselected, 7.39 seconds. Recovery
  reset/revocation, verification/audit/replay and committed registration despite
  queue failure retain behavior. A new case persists both jobs through real
  BullMQ in disposable Redis 6380 and reads exact names, payload fields and options.
  It removes only its uniquely identified jobs, never flushes shared queues.
- Initial queue E2E invocation used a synthetic `.test` MAIL_FROM rejected by
  configuration validation. The final test supplies valid self-contained mail
  configuration via a restored ConfigService spy; no production policy changed.
- Lint, typecheck, Prisma validation, build and architecture gates pass;
  lint/typecheck/build also pass after the final E2E addition.
  API builds fresh, unchanged packages may use Turbo cache. Architecture inventory
  stays at 144 known findings; no baseline edits hide queue coupling.
- Changed-file formatting and diff whitespace pass. Full root
  formatting still has 41 inherited deviations; full E2E/coverage/release CI
  acceptance remains D6/D7 work, not established by these selected tests.

Previous head `1010f6d` CI: Windows/Linux containment passed; dependency audit and
Web smoke failed; aggregate quality job was still in progress when inspected.
These are baseline acceptance concerns, not a green merge recommendation.

## Next

Recovery/verification Redis Lua/HMAC and login-abuse counters need owned narrow
capabilities, preserving limits, key namespaces, atomic TTL behavior and fail-closed
policy. The DEBT-042 lifecycle correction is already implemented separately;
broader D3.4 IAM/account-state acceptance remains open. Phase 11 has not started.
