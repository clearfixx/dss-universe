# Phase 9 — Reports & Moderation Annotations Foundation

## Outcome

DSS Universe now has one target-aware foundation for user reports and public
moderation history. Feature modules do not need private report tables or
unconstrained `targetType + targetId` coordinates.

## Ownership

The Interaction Platform owns:

- report subject identity and reporter evidence;
- the staff review queue and terminal review decision;
- public annotations attached to canonical targets or comments;
- annotation expiry and revocation history;
- Audit and Outbox evidence for state transitions.

The future Moderation Platform owns warnings, read-only restrictions, bans,
authority hierarchy, automatic thresholds and appeals. It may publish an
annotation through this boundary, but the annotation is not itself a sanction.

## Report invariants

- the target owner must authorize `READ` before a user may report content;
- a comment subject must belong to the supplied Interaction Target;
- one reporter may have only one open report for the same target or comment;
- `RESOLVED` and `DISMISSED` require reviewer, note and timestamp;
- a reviewed report is historical evidence and is never reopened in place;
- report reasons are not exposed by public content queries.

## Annotation invariants

- annotations use real target and optional comment foreign keys;
- kinds are `WARNING`, `READ_ONLY`, `BAN`, and `REMOVAL`;
- actor, reason and creation time are always public with the annotation;
- expiry does not delete history;
- revocation requires actor, reason and timestamp;
- staff commands require concrete permissions, never role-name checks.

## Permissions

- `content-reports.review` — list and review the staff report queue;
- `moderation-annotations.manage` — create and revoke public annotations.

Normal authenticated users can submit reports and read annotations only when
the target owner permits them to read the associated content.

## Events

- `content-reports.report.created.v1`;
- `content-reports.report.reviewed.v1`;
- `moderation.annotation.created.v1`;
- `moderation.annotation.revoked.v1`.

Event payloads carry identifiers and workflow coordinates. Free-form reasons
remain in the owning database and Audit record rather than being broadcast as
integration payload content.

## Deferred

- warning/read-only/ban issuance and expiration automation — Phase 14;
- appeals and authority hierarchy — Phase 14;
- Mission Control report queue frontend — later frontend delivery;
- notification delivery for report assignment or decisions — Phase 15.

Reports request human attention. They do not silently convict astronauts. 🚀
