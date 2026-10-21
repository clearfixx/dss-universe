# Security alerts and safe unlock

Credential-sensitive account events enqueue a dedicated security email alert:

- account temporarily locked after repeated invalid credentials;
- password changed by an authenticated viewer;
- password recovered with a single-use reset credential;
- account email changed, delivered to the previous address.

Jobs contain only an event ID, event kind, recipient and timestamp. Passwords,
tokens, IP addresses, user-agent values and the replacement email address are
never sent through the external mail provider. Detailed request context remains
inside the internal audit ledger.

Delivery retries independently and cannot roll back a credential change that
has already committed. A queue outage is therefore not presented to the user as
a failed password or email change.

There is deliberately no public `unlock account` endpoint. Locks expire after
the configured cooldown, while successful single-use password recovery clears
the durable lock, failed-attempt counter and active sessions in one transaction.
This is the safe recovery path when the owner did not cause the lock.
