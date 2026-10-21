# Email verification lifecycle

- Registration creates an active account and queues a verification email when mail delivery is configured.
- Resend is available only to the authenticated account and is rate-limited by account and IP.
- The queue contains user ID, email and request time only. The worker creates the raw token, stores only its SHA-256 digest and sends a fragment URL.
- Links expire after 24 hours and are single-use. Verification is transactional and audited.
- Changing an email clears `emailVerifiedAt`; the new address must be verified again.
- Unverified users may sign in. Features that require a trusted identity must enforce verification at their own authorization boundary instead of globally blocking the account.

The current page is intentionally minimal. Its job is to exercise the lifecycle while the final DSS UI is designed separately.
