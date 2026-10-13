# IAM access groups

IAM owns group metadata, membership validity/history and closed capability assignments.
Application code depends on private owned contracts; infrastructure owns Prisma and
transactional audit. DTOs contain transport validation only.

Public integration is limited to effective membership and public appearance readers,
plus the consumer-owned management-authority port wired by root composition.
No repository or application service is exported. Auth has no group dependency.

Use `group:<key>` for an access-group audience, not a display name or bare system role.
Premium is reserved and cannot receive capabilities. Guardian means the closed
Knowledge Forge capability only; it never means moderation or administration.

Metadata allows plain badge text/color/library icon keys, not arbitrary asset paths.
Public profile display excludes hidden, inactive, expired and revoked memberships.

Policy and rollout: [ADR-006](../../../../../../docs/architecture/adr/006-isolated-access-groups-and-capabilities.md).
