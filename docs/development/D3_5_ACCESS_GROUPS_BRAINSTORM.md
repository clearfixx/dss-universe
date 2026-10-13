# D3.5 — Generic groups, Premium and Guardian scope proposal

Date: 2026-10-13. Status: BRAINSTORM / implementation approval pending.
Authority: DEC-D1-01 and ADR-003 retain these capabilities in 1.0. This document
does not approve product-policy details or declare D3 accepted.

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
3. Premium is an explicit entitlement, not a role-name or display-color check.
   Recommend separate grant lifecycle; a group named Premium alone grants nothing.
   Paid billing and Community Points redemption are outside this package.
4. Premium may bypass ordinary Content Gates under the established contract;
   it never grants Guardian review/publish/rollback automatically.
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

- Approve the separation of Premium entitlement from display group membership.
- Approve the closed delegation allowlist, and who may manage membership/grants
  under current permissions without pre-implementing future owner restrictions.
- Approve the concrete schema/contract/migration design before implementation.

This is a design proposal, not approval to start coding D3.5.
