# Phase 9 — Shared Bookmarks Foundation

## Decision

DSS Universe uses one Bookmarks bounded context for private saved-item
relationships across News, Community Hub, Research Lab, Knowledge Forge,
Academy, Downloads, Profile Wall and future target owners.

Owning modules must not create duplicate bookmark tables.

## Contract

- one bookmark per authenticated owner and canonical Interaction Target;
- saving the same target again is idempotent;
- removing an absent bookmark is idempotent;
- save requires the target owner's `BOOKMARK` authorization;
- locked and retired targets reject new bookmarks;
- an owner may always remove their private bookmark, even if target visibility
  or lifecycle changed after it was saved;
- only real state transitions create Audit and Transactional Outbox evidence.

## Privacy boundary

`viewerBookmarks` is always scoped from the authenticated user context. GraphQL
does not accept another owner ID.

The bookmark projection exposes:

- bookmark ID;
- canonical interaction target ID;
- saved timestamp.

It deliberately does not copy or hydrate a title, excerpt, media, author or
owner coordinates. The relevant owner module resolves its content and applies
current `READ` policy. A saved relationship is not an access entitlement.

## Lifecycle

Bookmark rows are private relationships, not public authored content. Explicit
remove physically deletes the relationship while Audit and Outbox preserve the
state transition evidence. Account lifecycle may cascade private bookmark
cleanup according to security and privacy policy.

Interaction Targets remain restricted from deletion. This prevents bookmarks
from pointing to invented or physically removed public identities.

## GraphQL surface

- `saveBookmark(interactionTargetId)`;
- `removeBookmark(interactionTargetId)`;
- `viewerBookmarks(pagination)`.

## Deferred

- batched owner-domain content hydration;
- Command Deck saved-items composition;
- collections or user folders;
- bookmark-derived notifications;
- export/import workflows.

A bookmark knows where you wanted to return. It does not forge a key to the
room.
