# D3.3 — Private security-alert delivery capability

> Branch: `debt/d3-auth-identity-boundary`, draft PR #7.
> Status: security-alert delivery isolated; D3.3 infrastructure review remains open.

SecurityAlertService no longer receives QueueRegistryService. A private Auth-owned
SecurityAlertDelivery contract exposes only `enqueue` of the existing immutable
versioned SecurityEmailAlertJob. The infrastructure adapter alone selects the
security-email-alert.v1 queue operation and preserves eventId/jobId, five attempts,
exponential 5000ms backoff and cleanup settings. It reconstructs exactly four
payload fields so undeclared runtime fields are not forwarded.

Application still owns UUID/time, destination normalization and best-effort failure
handling after a committed security operation. Adapter errors propagate to that
policy. This is not a new durable Outbox, SMTP delivery guarantee or change in
worker deduplication. Existing BullMQ/Redis stack and worker contracts remain.
No dependency, migration, JWT, generated schema or frontend changes.

## Evidence

- Full API units with both DB opt-ins: 87 suites / 418 tests pass, no skips,
  54.988 seconds. Three adapter tests cover exact job/options, runtime payload
  allowlisting and transport errors. Existing service tests cover normalization,
  minimum payload and best-effort failure.
- Three selected real AppModule E2E pass / twenty-one unselected skipped,
  19.931 seconds: 2FA setup/recovery/disable/revocation, password recovery and login
  lock regressions. They validate composition but do not prove real SMTP delivery.
- Lint/typecheck pass nine tasks each (API fresh, eight cached); Prisma validates.
  Build and architecture checks pass, frozen inventory remains 144 without new
  findings. No baseline was edited to hide the registry dependency.
- Changed files pass formatting and `git diff --check`. Root formatting retains
  the known unrelated baseline; the initial run also caught the new report's
  table formatting, subsequently repaired.

## Remaining infrastructure review

| Consumer                    | Remaining dependency                    | Next action                                                    |
| --------------------------- | --------------------------------------- | -------------------------------------------------------------- |
| PasswordRecoveryService     | Redis Lua/HMAC and broad queue registry | Owned resend-limit and recovery-delivery capabilities          |
| EmailVerificationService    | Redis Lua/HMAC and broad queue registry | Owned resend-limit and verification-delivery capabilities      |
| LoginAbuseProtectionService | Redis Lua/private keys                  | Owned abuse-counter capability preserving failure policy       |
| SecurityAlertService        | Private delivery port                   | Implemented here; worker lifecycle/retention is not redesigned |

Do not claim D3.3 closed from this increment. D3.4/approved DEBT-042 correction,
IAM ownership and later debt packages remain open. Full CI/release acceptance is
not implied by the selected regressions.
