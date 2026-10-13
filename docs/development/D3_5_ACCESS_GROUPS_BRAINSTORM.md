# D3.5 — Generic groups, Premium and Guardian scope proposal

Date: 2026-10-13. Status: BRAINSTORM / implementation approval pending.
Authority: DEC-D1-01 and ADR-003 retain these capabilities in 1.0. This document
does not approve product-policy details or declare D3 accepted.

Owner-approved refinement: Premium is a non-staff access role. Audience access
comes first; Premium automatically bypasses numeric thresholds only inside that
audience. The bounded existing-gate implementation is authorized separately on
`debt/d3-5-premium-gate-contract`; wider groups/membership/Guardian implementation
still needs its own approved schema and mutation-authority scope. See
[ADR-005](../architecture/adr/005-premium-audience-before-thresholds.md).

## Why before Phase 11

Knowledge Forge must consume a real Guardian capability, not invent roles,
interpret display badges or use an always-allow adapter. Existing roles/direct
permissions do not implement generic groups. Keep Nest/Prisma/PostgreSQL and
existing Outbox; no new platform, facade or UI design.

## Proposed ownership and behavior

- IAM owns groups, membership periods, revocation and Premium entitlements.
- Authorization evaluates effective capabilities from current minimal IAM facts;
  Auth retains only authentication/session/eligibility ownership.
- Consumer-owned narrow ports expose decisions, not group repositories or Prisma.
- Users displays safe group metadata; display titles, badges and achievements do
  not grant capabilities. Implement metadata contracts without designing new UI.
- Group metadata covers name, color, badge/icon references and visibility, as the
  existing roadmap requires; validate values and route media through Media ownership.

## Recommended rules for approval

1. Membership validity uses server UTC and a half-open interval: start inclusive,
   expiry exclusive. Null expiry means indefinite; revoked/disabled is inactive.
   Reads enforce expiry immediately, even if a cleanup worker is late.
2. Delegation uses a closed, versioned allowlist of content-specific capabilities.
   Unknown capabilities and generic admin/moderation/security/DB/CMS/module-control
   grants are rejected. Registry keys must be reconciled before migration, not
   invented independently by each content module.
3. Premium is a separate non-staff access role, with owned membership validity
   and revocation. Display metadata alone must not grant authority. The former
   separate PremiumGrant product-model proposal is superseded. Paid billing and
   Community Points redemption are outside this package.
4. Audience/group visibility is mandatory before numeric thresholds. Premium
   automatically bypasses those numeric thresholds only after audience access;
   it never grants Guardian review/publish/rollback, staff tools or Command Deck.
5. Guardian is explicitly delegated Knowledge Forge authority. Fine-grained review,
   publish/reject/rollback semantics belong in Phase 11's brainstorm; D3.5 supplies
   the authoritative capability boundary and deny behavior, not revision workflows.
6. Existing account disable and access denials stay authoritative. Future Phase 14
   sanctions override entitlements; no fabricated sanction implementation or
   default-allow provider may be called complete.
7. Sensitive grants/revocation/changes are attributable and audited atomically.
   Grant administration requires explicit existing-authority review; neither group
   membership nor Premium allows administering groups or self-escalating.

Owner uniqueness, appointment rules and Command Deck step-up are separately
scheduled product requirements. Do not implement them as an incidental D3.5 change.

## Implementation sequence after approval

1. Freeze group/entitlement/capability contracts, mutation authority and threat model.
2. Add reviewed additive schema/migrations with no implicit privilege conversion.
3. Implement IAM-owned writes and atomic audit; preserve historical evidence.
4. Implement authoritative Authorization reads and integrate existing Content Gates.
5. Publish minimal Guardian consumer contract for Phase 11; no feature implementation.
6. Prove expiry/revocation, overlap, forged names, self-escalation denial,
   disabled accounts, rollback and real concurrent mutation behavior.
7. Full quality gate, clean generated output, draft PR and reviewed migration
   apply/rollback strategy; no merge while required checks remain red.

Use the reserved `debt/d3-5-iam-access-groups` branch only after scope approval.
Do not fork an implementation from an unaccepted stack without recording its base
and acceptance dependency. D4 planning can proceed independently.

## Owner decisions still needed

### Current-code integration evidence (2026-10-13)

`PrismaContentGatesRepository.viewerFacts` currently maps role names into `groups`;
`ContentGatesService.evaluate` grants ordinary-gate bypass when one equals
`premium` case-insensitively. Generic group membership, entitlement expiry and
Guardian capabilities are not represented by these facts. This is part of
DEBT-008/024, not evidence that an anonymous caller can assign privileged roles.
The existing `ContentGate.ownerId` means content author, not platform owner;
do not reinterpret it as the new unique owner identity.

### Concrete data/contract proposal

- `AccessGroup`: opaque ID, immutable unique key, editable display metadata and
  enabled state. Badges reference Media rather than introducing a file store.
- `GroupMembership`: own grant ID, opaque subject/group IDs, validity interval,
  revocation and attributable audit. Preserve revoked history. Regrant is a new
  auditable grant, not clearing the old revocation. Effective membership exists
  when at least one unrevoked interval is valid and the group is enabled.
- `GroupCapability`: only entries from a closed reviewed capability allowlist,
  never arbitrary permission keys. IAM owns assignments; Authorization owns the
  decision and validates each requested operation against the registry.
- Premium access-role membership uses the owned membership validity/revocation
  model; a separate independent PremiumGrant product entity is not approved.
  No payment/Points processing is introduced.
- Authorization reads only effective stable group keys, effective entitlement
  and approved capabilities. Display visibility never changes authority.
- Content Access consumes narrow membership/entitlement facts through root
  composition, not IAM persistence. Keep comments/reputation fact ownership
  separate; this package is not permission to move all statistics into IAM.
- Existing role/direct permission behavior remains unchanged. Premium and groups
  are not inserted into JWTs as permanent authoritative claims.

### Membership and Guardian contract review

Source review after `5e0aa10`: current Role/RolePermission schema and
PrismaRoleRepository.create accept arbitrary permission IDs. The bounded gate
fix therefore cannot prove that every role called Premium is non-staff. This is
an existing DEBT-008/024 isolation gap, not an anonymously exploitable grant path.

Proposed wider D3.5 contract for approval:

| Boundary             | Contract                                                                                                                                                    |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Access-role identity | AccessGroup ID and immutable canonical key; Premium is a reserved non-staff access role represented by this mechanism, not a second independent entitlement |
| Membership           | Grant ID, subject/group IDs, validFrom, optional validUntil, revokedAt, attributable grant/revoke audit; intervals use server UTC and expiry is exclusive   |
| Effective access     | Enabled group plus at least one valid unrevoked membership; overlap is OR, no scheduled cleanup dependency or permanent JWT grant                           |
| Staff authority      | Access-group membership contributes no generic RolePermission/UserPermission keys; independent existing staff assignments retain their own authority        |
| Guardian             | Explicit allowlisted Knowledge Forge capability; no Premium implication, no moderation/Command Deck permission, no resource-audience bypass                 |
| Mutation authority   | Proposed existing permissions.manage gate checked in application and transport, never obtained from membership; audit and write atomic                      |
| Display              | Allowlisted metadata only; renaming/recoloring a group cannot grant authority or turn it into Premium/Guardian                                              |

IAM owns the grant/history storage and publishes minimal current membership facts.
Authorization owns the capability decision, while Content Access consumes a narrow
port wired in root composition. Auth does not acquire group or Guardian knowledge.
Pure application contracts expose IDs, effective keys and decisions, not Prisma
rows or clients. Use separate owned DTO/mapper/repository files and named exports.

System-role audiences and access-group audiences must remain distinguishable by
stable identity/type. A custom group named admin must not impersonate a system
role. Wider audience builders belong to content phases; D3.5 must establish the
non-colliding identity contract now rather than guessing from display names later.

No automatic migration grants from legacy Premium-like names. Require explicit
mapping of real assignments and GROUP gate references, preserve history, audit
conversion and test revocation/expiry on the new reader. Do not delete the old
data as a rollback strategy. Unknown mappings fail closed. Existing disable
controls remain authoritative; future sanctions cannot be described as delivered.

The closed capability catalog initially contains only the explicit Guardian
foundation required by Phase 11. Specific review/publish/reject/rollback resource
workflow semantics still require the Phase 11 brainstorm; no workflow is built
or authority expanded by this design document.

Implementation approval must cover the additive schema/migration, current-phase
mutation authority and closed capability catalog. Owner-only staff appointment,
Command Deck step-up and new moderation tools remain separately scheduled.

### Migration and authority proposal

Additive tables/constraints and new readers come first. No automatic entitlement
or group grant conversion based on a role's name. Inventory persisted GROUP gate
keys and existing Premium-like roles before switching readers. Require an
explicit reviewed mapping for legacy keys; unresolved references deny access
with operator visibility, rather than guessing or preserving name-based bypass.
Preview affected records and migration effects in a disposable copy before apply.
Do not drop existing gate/role columns or grant records. Rollback must not
re-enable name-based Premium bypass after newly revoked/expired grants.

Recommend temporarily protecting IAM group/Premium mutations with the existing
`permissions.manage` authority, with server-side checks and atomic audit; this
already controls direct/role permissions. Do not auto-grant a new authority to
all admins, and do not let membership itself confer management rights. This is
a proposed current-phase delegation policy, not implementation of the later
owner-only staff-appointment/Command Deck contract. Approve it explicitly before
API/schema work. Final unique-owner integration remains separately scheduled.

Acceptance must prove immediate group disable/removal, grant expiry/revocation,
overlap, forged display names, denied capability keys, mutation authorization,
legacy-key migration, audit rollback and current Content Gate compatibility.
Phase 11 publishes/reviews actual revisions only after its own brainstorm.

- Premium non-staff role and audience-before-threshold behavior are approved;
  freeze its stable identity and membership mapping in the wider schema design.
- Approve the closed delegation allowlist, and who may manage membership/grants
  under current permissions without pre-implementing future owner restrictions.
- Approve the concrete schema/contract/migration design before implementation.

This is a design proposal, not approval to start coding D3.5.
