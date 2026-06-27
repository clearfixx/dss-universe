## Status

Approved

## Context

Authentication is a cross-cutting infrastructure concern. It should not be duplicated across business modules.

## Decision

Authentication lives in:

```text
apps/api/src/core/auth

This module owns:

JWT strategy
JWT guard
authenticated user type
auth decorators
role guards
Consequences

Business modules use simple decorators like:

@Authenticated()

They do not depend directly on Passport or JWT implementation details.

This keeps authentication centralized and easier to evolve.
```
