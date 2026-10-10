# ADR-003 — Authentication subject, profile and access ownership

Date: 2026-10-10. Status: owner-approved direction for D3; implementation pending.
Authority: explicit D2 conversation approval and [D1 decisions](../../development/D1_SCOPE_DECISIONS.md).
Supersedes the ownership/role-guard guidance in [ADR-001](001-auth-core.md) and
[ADR-002](002-rbac.md), not their historical implementation evidence.

## Context

Auth currently imports Users repository and mapper internals. JWT validation also
reads persisted user/session state directly. Hiding this behind a generic Users
facade would preserve the coupling. Separate ownership must preserve the existing
registration, login, refresh, verification, recovery, abuse protection, alerts,
sessions and 2FA behavior and external response shape.

## Decision

| Concern                                                                                          | Owner                                           | Boundary                                                                   |
| ------------------------------------------------------------------------------------------------ | ----------------------------------------------- | -------------------------------------------------------------------------- |
| Opaque authentication subject, credentials, authenticators, session state, verification/recovery | Auth                                            | Auth-owned ports/adapters; no profile aggregate or Users repository        |
| Profile, public identity presentation, social/user content                                       | Users                                           | Profile commands and allowlisted immutable profile views                   |
| Roles, permissions, generic group membership/assignment, Premium grants and expiry               | IAM                                             | Owned assignment operations; no password or token logic                    |
| Effective action/capability decision                                                             | Authorization                                   | Narrow decision contract; default deny and sanction precedence             |
| Registration orchestration and combined transport response                                       | Composition use case / presentation composition | Explicit owner operations; no foreign repository or mapper imports in Auth |
| Route authentication mechanics                                                                   | Core auth adapters                              | JWT/Passport/decorators, consuming Auth contracts, not business ownership  |

`subjectId` is an opaque stable identity, not a Users entity. Auth may need a login
identifier/delivery address and a minimal account-eligibility state; those values
are authentication data, not permission to load profile fields. Eligibility is
provided through a named authority/port with an explicit failure policy. Subjects
must not be authenticated when disabled/revoked or when required authoritative
state cannot be established. Existing public `userId` fields may map to `subjectId`
inside an adapter during migration; do not change IDs or create a second identity
silently.

A physically shared database remains allowed. This ADR introduces no tables and
does not require a new identity microservice/module. Existing User-table placement
is transitional persistence, not ownership authority. D3 must inventory every
credential/profile/status field before an additive migration or adapter is chosen.
Do not duplicate mutable eligibility state without a consistency/revocation contract.

Registration is coordinated outside Auth/Users business services through narrow
commands. If identity and profile creation must be atomic, an infrastructure unit
of work implements a composition-owned transaction contract. Never expose a Prisma
transaction/client through application ports. No incomplete account may receive a
valid session. Existing GraphQL/REST profile fields remain assembled in presentation
composition using a public profile view, not a Users mapper inside Auth.

Authorization is a logical ownership boundary, not a mandate to scaffold another
deployment. D3 must choose its concrete home based on the existing core/IAM layout.
JWT claims are authentication evidence, not perpetually authoritative permissions:
session revocation, account eligibility and access version changes must retain the
current immediate invalidation behavior. Security decisions cannot rely solely on
an eventually consistent event projection.

Auth returns only authentication/session results and allowlisted subject context.
Passwords, hashes, refresh/verification/recovery tokens, TOTP/recovery secrets and
provider credentials never enter profile DTOs, public events, logs or arbitrary
cross-module responses. Token-bearing transport responses are explicit and retain
their existing security controls. DTO files contain DTOs, not orchestration/mapping.

## Groups, Premium and Guardian delivery

Generic groups and Premium remain required by the 1.0 contract. IAM owns membership
and grant lifecycle; Authorization evaluates the effective capability. Guardian is
a capability consumed by Knowledge Forge, not an Auth field or a new user role
invented inside Phase 11. Titles/achievements do not grant authority. Phase 14
sanctions override Premium/groups; absent future sanction integration must not be
described as delivered, and existing deny/disable controls remain authoritative.

D3/D4 boundary remediation does not silently implement generic groups. Schedule
**D3.5 — IAM access groups and Premium**, after D3 and before final D6/D7 readiness,
as a separately scoped brainstorm/owner approval and implementation branch. Its
required decisions include grant/expiry/revocation, delegation allowlists, audit,
Guardian capability and denial precedence. Scheduling is not implementation
authorization. Phase 11 cannot proceed with the capability missing or a fabricated
always-allow adapter. Shared Search and MinIO/S3 remain separately deferred.

## Alternatives and consequences

- Keeping Auth dependent on Users internals: rejected; it conflates profile and credentials.
- A generic Users facade: rejected; broad data/service coupling remains.
- Splitting databases/services now: unnecessary; ports preserve ownership in the modular monolith.
- Removing profile fields from current responses: rejected as an avoidable breaking change.

D3 starts with characterization tests and a field/operation ownership matrix.
Security/integration/E2E tests must cover atomic registration failure, session
refresh/revocation, disabled/deleted accounts, access-version changes, verification,
recovery, 2FA and secret allowlisting. Any schema change requires reviewed data
migration/rollback strategy. D2 changes no production behavior.
