# Phase 9 — Activity Feed

The Universe feed is a derived, rebuildable read model. Source modules remain
the owners of content and publish versioned integration events; Activity stores
only allow-listed coordinates and small presentation hints.

## Read modes

- Guests receive only public, non-retracted events.
- Members receive public/member events, with blocked actors excluded.
- Viewer ranking is deterministic: mention, following, interest, own activity,
  then recency. Recency is a tie-breaker inside a stable weighted score.
- Module filtering is performed against the projection, not source tables.

## Visit state

`activity_feed_states` stores one server-owned `lastVisitedAt` cursor per user.
Reading does not mutate it. The UI explicitly marks the feed visited after a
successful read, so the response can still identify everything that arrived
since the previous visit.

## AI isolation

The canonical response is complete without AI. Future summaries may decorate
this response but cannot replace, reorder or gate it; provider failure therefore
leaves the deterministic feed intact.

## Privacy

The public API omits metadata entirely. It exposes only event identity,
module/action coordinates, time, unread status and an explanation of why a
personalized item was selected.
