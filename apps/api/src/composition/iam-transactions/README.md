# IAM transactional subject composition

This root assembly binds Auth-owned opaque subject existence and IAM-owned
membership/role writes. It owns transaction lifetime, not eligibility, profile,
permissions or last-holder policy.

- Membership grant retains the default transaction: group lock/enabled check,
  then subject existence, then membership and atomic audit. No Outbox step.
- Role revocation retains explicit Read Committed: subject existence, role lock,
  role/assignment, holder count, the existing IAM safety check, then DELETE.
  No new audit/outbox stage inside persistence.

Both readers/writers use the same supplied client. Only infrastructure receives
the subject-lookup callback; business ports contain IDs/values/results and the
existing operation-specific IAM policy callback, never ORM clients. The Auth
reader accepts every existing state and is not ACTIVE eligibility. Errors abort
without fallback, caching, retries or altered timeout/isolation settings.

Independent IAM subject/assignment-anchor reads remain a separate package.
