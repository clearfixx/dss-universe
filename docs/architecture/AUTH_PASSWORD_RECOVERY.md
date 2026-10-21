# Password Recovery Security Flow

This package extends the existing DSS authentication system after Phase 10.
It does not replace the roadmap or introduce an external identity provider.

## Flow

1. `/forgot-password` validates an email through a Next server action.
2. `requestPasswordRecovery` checks shared Redis limits and enqueues the normalized
   address without checking whether an account exists. Unknown, inactive and
   throttled addresses get the same generic response.
3. The existing worker consumes the dedicated `dss.password-recovery` queue.
   Only active accounts receive mail. It generates 32 random bytes, stores only
   SHA-256, and sends an SMTP message. The token lives for 30 minutes. A newer
   request replaces the previous token. Stale queued requests are discarded.
4. `/reset-password#token=...` captures the credential in memory and clears the
   fragment from browser history. No credential is sent in an HTTP URL.
5. `resetPassword` hashes the new password, locks the user row and atomically
   consumes the unexpired token, updates the password, increments `authVersion`,
   revokes all sessions and appends an audit record. No automatic login occurs.

Issuance and consumption use the same user-row lock order. A token includes the
account auth version, so previous tokens stop working after credential changes.
Passwords have an 8-character minimum and 72-byte UTF-8 maximum to avoid silent
bcrypt truncation. PostgreSQL integration tests cover concurrent consumers and
transaction rollback, in addition to service, worker and frontend tests.

## Deployment

Apply the additive `20260922220000_password_recovery` Prisma migration and run
both API and worker with the same `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`,
`MAIL_PASSWORD`, `MAIL_FROM`, and `PASSWORD_RESET_WEB_URL` settings. The last value
is a fixed trusted URL such as `https://dss.example/reset-password`, never derived
from a request Host header. Only local development URLs may use HTTP. Production
SMTP requires TLS. Credentials belong in environment configuration.

Without SMTP configuration the API reports temporary unavailability and the
recovery worker remains disabled. Configure a local SMTP capture service for
development; never send test messages to real users. No credential is logged or
returned in API responses. Queue payloads contain the email address and timestamp
but no token. Jobs are removed when completed or when retries are exhausted.
Delivery failure emits a generic worker log suitable for alerting.

Limits: 3 requests per email and 20 per API-observed IP per 15 minutes;
5 reset attempts per credential and 30 per API-observed IP per 15 minutes.
Keys are HMAC digests with TTL. Redis failure fails closed. Server actions share
the frontend server's API-observed IP; this deliberately imposes a conservative
shared limit until a trusted proxy identity mechanism is introduced. Never trust
arbitrary X-Forwarded-For values to bypass those limits.

The response confirms submission, not guaranteed email delivery. SMTP retries may
replace an earlier link if delivery acknowledgement is uncertain. Users should
use the most recent email. Successful reset invalidates every prior link/session.

Integration tests opt in with `RUN_RECOVERY_DB_TESTS=1` and a local DATABASE_URL.
They create and remove a unique schema; application records remain untouched.
