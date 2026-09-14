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

## Phase 9 feed boundary

- `publicActivityFeed` exposes only `PUBLIC` projections to guests.
- `viewerActivityFeed` exposes `PUBLIC` and `MEMBERS` projections, excludes
  blocked relationships, and ranks mentions, followed actors, interests, own
  activity and recency with stable deterministic weights.
- module filters are normalized and bounded at the application boundary;
- a dedicated per-user cursor supplies “since last visit” and unread markers;
- `markActivityFeedVisited` advances that cursor with a server timestamp;
- recommendation mode is explicit and deterministic. Optional AI summaries
  can be added later without becoming a feed dependency or failure mode.

Activity metadata remains an internal allow-listed projection. GraphQL never
returns copied content bodies, request metadata or arbitrary JSON.

🚀 Build. Share. Grow.
