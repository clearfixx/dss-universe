# Login abuse protection

Login protection is intentionally split across two persistence layers:

- Redis keeps short-lived, HMAC-keyed counters and cooldowns for normalized identities and client IP addresses.
- PostgreSQL keeps the failed-attempt count and lock expiry for known accounts so a cache restart cannot erase an account lock.

Defaults are configurable through `AUTH_LOGIN_FAILURE_LIMIT`, `AUTH_LOGIN_LOCK_MINUTES`, `AUTH_LOGIN_IP_FAILURE_LIMIT`, and `AUTH_LOGIN_WINDOW_MINUTES`.

Unknown and known accounts execute a password-hash comparison and receive the same invalid-credentials response. Once a Redis or durable lock is active, requests receive one generic temporary-unavailability response. Raw emails are never used in Redis keys.

Successful authentication resets the account counter and records an audit event. Reaching the lock threshold records a separate denied audit event. A lock expires automatically; a successful password recovery also clears it. This provides a safe recovery path without exposing a public unlock endpoint.
