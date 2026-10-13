# ADR-006 — Isolated access groups and delegated capabilities

Date: 2026-10-13. Status: owner-approved implementation scope; review pending.
Branch: `debt/d3-5-iam-access-groups`.
Stack base: `04a9d50` on `debt/d3-5-premium-gate-contract` (draft PR #8).
This is an unaccepted review stack, not a waiver to merge red checks.

## Decision and ownership

The owner explicitly approved the full D3.5 package: generic groups, membership
periods/revocation, non-staff Premium, explicit Knowledge Forge Guardian, additive
migrations and atomic audit. Current mutations require `permissions.manage`.
No new owner or Command Deck authority is introduced.

IAM owns three additive tables: access groups, immutable membership grants and
closed capability assignments. It publishes frozen, narrow membership and public
display readers, never its repository or an ORM client. Auth publishes only
current account eligibility; no IAM reads or group knowledge enter Auth.
Authorization owns decisions. Root composition adapts published evidence into
consumer-owned ports for Authorization, Content Access and Users.

Premium is the reserved `AccessGroup(kind=PREMIUM,key=premium)`, not a generic
system Role or a second independent PremiumGrant. Its membership contributes
zero generic permission keys. A custom display name cannot become Premium.
Independent staff role/direct assignments retain their own authority, including
when their holder also has Premium.

## Invariants

- Half-open UTC validity: `validFrom <= now < validUntil`; null expiry is indefinite.
- Enabled group plus any valid, unrevoked grant determines membership. Overlap is OR.
- Regrant creates a new immutable record. Revocation is attributable and idempotent;
  a repeated revoke preserves the first reason/time/actor and creates no second audit.
- Group identity and membership history are protected by PostgreSQL constraints/triggers.
- Mutation plus audit commit or roll back together. Lock group changes/grants and
  membership revocations to serialize competing writes.
- The v1 capability catalog contains only `KNOWLEDGE_FORGE_GUARDIAN`.
  Unknown keys and generic staff/security permissions are not accepted. PostgreSQL
  additionally forbids every capability assignment on Premium.
- `hasKnowledgeForgeGuardian` is a Knowledge Forge foundation, not review/publish/
  rollback implementation, a global moderator role, or an audience override.
- Current ACTIVE eligibility is required. Provider errors fail closed; stale JWT
  claims and hidden/public display settings cannot override decisions.
- Reads are per-call current snapshots, not cancellation of an already running command.
  Phase 14 sanctions still need their real owner/policy; no fake allow-provider is added.

## Audience identities and compatibility

Access-group audience keys are `group:<canonical-key>`; system-role keys are
`role:<system-role-name>`. Existing bare system-role keys remain compatible
unless they start with reserved `group:` or `role:` prefixes. Reserved-prefix
roles are available only through their explicit `role:` identity, preventing
an alias from impersonating a custom group. Matching retains existing
case-insensitive Content Gate semantics.

GROUP audience remains mandatory before Premium/author numeric threshold bypass
(ADR-005). Content statistics no longer supply authority-bearing role names.
Legacy roles merely named Premium do not create an entitlement. No automatic
membership or GROUP-key conversion is performed.

Before rollout, run the read-only preflight inventory and approve explicit
mappings for actual persisted legacy keys/assignments. Preserve their evidence;
unknown mappings deny. The disposable seeded DB has no Premium-like roles,
reserved-prefix roles or GROUP keys to convert. This is not production inventory.

## Safe display and API

Metadata is bounded display text, hexadecimal color and a library icon key.
`badgeLabel` is text, not an uploaded image or filesystem path. Uploaded badge
assets, if introduced, must reference Media and its lifecycle; this package
introduces no parallel media store or visual redesign.

Users exposes authenticated self-display at `GET /api/users/me/access-groups`.
Only public, enabled, currently effective groups are selected; no capability,
grant history, actor IDs or private group metadata enter this projection.
Hidden display does not revoke authority.

Administrative group/history routes are under `/api/iam/access-groups`, protected
both at HTTP and application boundaries by current `permissions.manage`.
There is no destructive history endpoint or arbitrary permission delegation.

## Migration / recovery

Apply all migrations to a disposable copy, run preflight and relevant tests,
review mappings, then promote under the normal release gate. Keep the old
role/gate data intact. Do not downgrade to the former name-based Premium reader
after the new validity/revocation model is in use; recovery is a reviewed forward
fix (or controlled restoration of a consistent backup), never deleting history
or resurrecting revoked entitlements. No production migration was run.

Full category/section/article ACL builders, unique-owner protection, Command Deck
step-up, sanctions and Knowledge Forge workflows remain in their approved phases.
