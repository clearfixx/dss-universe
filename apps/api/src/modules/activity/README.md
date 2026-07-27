# Activity Platform

## Purpose

Activity is a rebuildable, privacy-safe read model for events that may appear
in DSS feeds. It does not own profile posts, news, forum topics, articles or
other source content.

## Flow

```text
Domain transaction
  → versioned integration event
  → Transactional Outbox
  → BullMQ
  → idempotent Worker projector
  → activity_entries
  → privacy-aware GraphQL boundary
```

The initial producer is Profile Wall. Future modules may publish supported
events without importing Activity or Users.

## Safety rules

- Audit records are never used as public feed entries.
- Projectors copy only allow-listed metadata.
- Content bodies, IP addresses, user agents and security metadata stay out.
- Tombstoned source content retracts its projected activity.
- `sourceEventId` makes projection retries idempotent.
- Activity records are projections and may be rebuilt from canonical events.

## Current boundary

This Phase 7 foundation exposes paginated user activity with profile privacy
and block enforcement. Guest feeds, following/interests ranking, unread
markers, module filters and cross-module aggregation remain in Phase 9.

🚀 Build. Share. Grow.
