# ADR-002: Role-Based Access Control

## Status

Approved

## Context

DSS Universe needs to distinguish between authenticated users and users who are allowed to perform specific actions.

Authentication answers:

```text
Who are you?

Authorization answers:

Are you allowed to do this?
Decision

DSS Universe uses RBAC as the first authorization layer.

Protected routes use:

@Authenticated()

Role-protected routes use:

@Authenticated(UserRole.ADMIN)

The implementation is based on:

Roles decorator
RolesGuard
ROLES_KEY
AuthenticatedUser.role
Verified behavior
User	Protected Route	Admin Route
Guest	401	401
USER	200	403
ADMIN	200	200
Consequences

RBAC is simple and explicit.

Future permissions can be built on top of this foundation without removing the current role system.
```
