# Interaction Platform Passport

## Purpose

The Interaction Platform gives shared capabilities one canonical coordinate
without taking ownership away from News, Community Hub, Research Lab,
Knowledge Forge, Academy, Profile Wall, or future modules.

## Current foundation

- `InteractionTarget` is the durable identity referenced by shared features.
- Owner coordinates are immutable after registration.
- Targets transition through `ACTIVE`, `LOCKED`, and `RETIRED`.
- Owner modules register one policy per stable target kind.
- Missing owner policy fails closed.
- Lifecycle restrictions run before owner authorization.
- Registration and status changes produce Audit and Outbox evidence.
- Profile Wall is the first integrated target owner.
- Comments owns FK-backed top-level comments and one-level replies.
- Every comment version is retained in immutable revision history.
- Deleted comments become body-free tombstones.
- Reactions owns one idempotent `LIKE`, `UPVOTE`, or `DOWNVOTE` per actor and
  target.
- Reaction aggregates and vote score are rebuildable projections.
- Bookmarks owns private, idempotent saved-item relationships.
- Bookmark lists expose only the authenticated owner's target coordinates.
- Comments resolves bounded `@username` mentions to active user relations.
- Mention state follows comment edits and tombstones without deleting history.
- Mention transitions emit notification integration events; Comments never
  writes notification inbox rows or sends delivery directly.
- Reports provides one open user report per target or comment subject.
- Moderation annotations preserve public warning/removal history, including
  expiry and revocation transitions.

## Boundary

Owning modules decide whether a user may read, comment, react, or bookmark.
Future Comments, Reactions, and Bookmarks modules store only the canonical
`interactionTargetId`; they must not recreate unconstrained
`targetType + targetId` relationships.

Comments, Reactions, and Bookmarks already follow this contract. The first
Comments API uses bounded plain text with relational mentions. Reports and
staff moderation annotations now share the same canonical target boundary;
structured DSS Editor documents arrive in their dedicated package.

Interaction counters are projections and may be rebuilt. They are never the
sole source of truth. Reaction records never mutate Reputation implicitly.
Bookmark lists never hydrate owner-domain content or bypass its `READ` policy.

## Lifecycle

```text
Owner transaction
  → register InteractionTarget
  → create owner record with a real FK
  → emit audit + outbox evidence

Shared capability request
  → load InteractionTarget
  → enforce lifecycle
  → ask owner policy
  → allow or deny
```

Targets are retired, not deleted. Public owner records follow their own
tombstone policy.

🚀 Build. Share. Grow.
