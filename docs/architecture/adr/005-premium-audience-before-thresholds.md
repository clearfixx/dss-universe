# ADR-005 — Audience before Premium threshold bypass

Date: 2026-10-13. Status: owner-approved behavior, bounded Content Gate implementation.
Implementation branch: `debt/d3-5-premium-gate-contract`.
Stack base: `5896013` on D3; depends on its eventual acceptance, not a merge waiver.

## Decision

Premium is a separate non-staff access role: badge and explicitly allowed content,
never Guardian, moderation, administration or Command Deck authority. The prior
proposal requiring a separate PremiumGrant product entity is not approved and is
superseded by this role-based product decision. Duration/revocation persistence
and generic-group management remain in the wider D3.5 design.

Audience membership is checked before numeric thresholds. Premium automatically
bypasses numeric thresholds only within accessible content. Author preview cannot
override audience restrictions either. Existing GROUP requirements are mandatory
audience checks; ALL/ANY combines numeric requirements only. A GROUP-only gate
allows a matching member without claiming a numeric bypass. Missing/inactive
viewers cannot receive a bypass.

This intentionally tightens legacy mixed ANY gates: reputation or Premium alone
can no longer compensate for missing required GROUP membership. Persisted data
is retained; there is no migration rewriting policy into wider access.

Content owners remain responsible for category/section/article audience checks,
inheritance, sanctions and removal visibility before invoking editor projection.
This package implements the existing gate's GROUP constraint, not an entire Forum
or News ACL builder. `ContentGate.ownerId` is the content author, not platform owner.
No global admin/platform-owner bypass is invented inside this low-level evaluator.

## Scope and verification

Change the bounded gate evaluator and tests, including actual editor redaction
through the evaluator and authoritative inactive-account rejection. No staff UI,
owner protection, Guardian workflow, new group schema or role-management API.
The transitional facts adapter still reads trusted persisted role names; it is
not a completed generic-group implementation. Do not imply that renaming alone
creates a safe, non-delegable Premium role model.

Required evidence: ALL/ANY, GROUP-only, ordinary versus Premium/author, all numeric
threshold kinds, inactive/missing viewers, denied-payload redaction and no new
authority claims. The broader D3.5 exit gate and global quality debts remain open.
