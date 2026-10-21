# ADR-001 — Core authentication mechanics (historical)

Superseded for ownership and authorization by [ADR-003](003-subject-and-access-ownership.md).
Keep this implementation-era record as history; role guards are not current
permission policy. Core retains transport mechanics, not profile ownership.

## Status

Historical; superseded direction, not guidance for new Auth business code.

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
