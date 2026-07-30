# Phase 9 — Shared Reactions Foundation

## Decision

DSS Universe uses one Reactions bounded context for every approved
`InteractionTarget`. News, Community Hub, Research Lab, Knowledge Forge,
Academy and Profile Wall must not create private vote tables.

## Contract

- one reaction per actor and interaction target;
- supported v1 kinds are `LIKE`, `UPVOTE` and `DOWNVOTE`;
- setting the same kind again is idempotent;
- setting another kind atomically replaces the previous reaction;
- clearing a missing reaction is idempotent;
- `READ` and `REACT` authorization belongs to the target owner;
- locked or retired targets reject reaction changes;
- all real transitions create Audit and Transactional Outbox evidence.

## Aggregates

`ReactionAggregate` stores:

- likes;
- upvotes;
- downvotes;
- score (`upvotes - downvotes`);
- total reactions.

The aggregate is a rebuildable projection. Canonical `Reaction` rows remain
the source of truth. Target-scoped advisory locks serialize changes so the
projection can be rebuilt safely inside the same transaction.

## Separation from Reputation

A reaction is a signal about content. Reputation is an explained,
user-to-user trust decision with its own cooldown, reason and reversal ledger.

No content reaction changes author Reputation or Community Points implicitly.
A future product rule may consume a reaction event and create a separate,
audited ledger entry, but that integration must be explicit.

## GraphQL surface

- `setReaction(input)` sets or switches the viewer reaction;
- `clearReaction(interactionTargetId)` removes it;
- `reactionSummary(interactionTargetId)` returns aggregate values and the
  viewer reaction.

All operations are authenticated in the foundation. Public aggregate reads
may be added when guest target policy and public GraphQL context are delivered.

## Deferred

- target-specific reaction catalogues;
- reactor lists;
- activity and notification projections;
- Community Hub hot-ranking integration;
- explicit, configurable Gamification consumers.

Reaction rows vote. Reputation entries explain trust. Similar buttons must not
silently merge two domains.
