# Phase 9 — Interaction Target Registry

## Decision

DSS Universe uses a canonical `InteractionTarget` identity as the foreign-key
boundary for shared comments, reactions, bookmarks, content gates, and future
interaction capabilities.

The registry coordinates capabilities; it does not own domain publication or
visibility policy.

## Invariants

1. Every shared interaction references an existing target by a real foreign
   key.
2. A domain record owns exactly one target where that capability is enabled.
3. Target identity, kind, owner module, owner type, and owner id are immutable.
4. Targets are never physically deleted. They become `LOCKED` or `RETIRED`.
5. `LOCKED` targets may be read when the owner permits it, but cannot receive
   new comments, reactions, or bookmarks.
6. `RETIRED` targets deny every capability.
7. An owner module must register exactly one policy for its stable target kind.
8. A missing owner policy fails closed.
9. Audit and Outbox records are written in the same transaction as target
   registration or lifecycle changes.
10. Aggregated counters remain rebuildable projections.

## First owner: Profile Wall

`UserWallPost.interactionTargetId` is a unique, required foreign key. Profile
Wall post and target registration happen in one transaction. Tombstoning the
post changes its target to `LOCKED`.

The Profile Wall policy applies:

- canonical owner-coordinate validation;
- bidirectional user blocks;
- profile visibility;
- owner access.

This policy stays inside Users. The shared Interaction Platform only routes
the decision.

## GraphQL pilot

Authenticated clients may query:

- `interactionTarget(id)` to resolve the canonical coordinate;
- `interactionTargetAccess(targetId, capability)` to receive an explicit
  allow/deny decision and stable reason.

This pilot is the contract that Comments, Reactions, and Bookmarks will use.

## Deferred work

- shared Comments and reply trees;
- Reactions and aggregate projections;
- private Bookmarks;
- owner policies for News, Community Hub, Research Lab, Knowledge Forge, and
  Academy;
- moderation and content-gate integration.
