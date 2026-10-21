# Phase 9 — Shared Comments Foundation

## Decision

DSS Universe has one Comments bounded context for Profile Wall, News,
Community Hub, Research Lab, Knowledge Forge, Academy, and future modules.
Product modules must not create private duplicate comment tables.

Comments references only `InteractionTarget.id`. The target owner still decides
whether a user may read or comment.

## Delivered contract

- FK-backed top-level comments;
- one bounded reply level;
- stable, independently paginated top-level and reply queries;
- immutable revision history beginning with version 1;
- canonical versioned `COMMENT` editor documents on comments and revisions;
- backward-compatible `body` plus normalized `searchText` projections;
- legacy plain-text input adapter for existing GraphQL clients;
- author editing and tombstoning;
- body-free public tombstones;
- transactional Audit and Outbox evidence;
- semantic `comments.comment.created.v1`, `edited.v1`, and `tombstoned.v1`
  events;
- GraphQL queries and mutations protected by target-owner policy.

## Invariants

1. A comment always belongs to an existing `InteractionTarget`.
2. A reply belongs to the same target as its parent.
3. Replies cannot become parents; thread depth is bounded to one reply level.
4. New comments require the target's `COMMENT` capability.
5. Reads require the target's `READ` capability.
6. Locked targets reject new comments and edits.
7. Comment revisions are immutable and cannot be deleted.
8. Tombstoning clears canonical JSON and all public text projections while
   preserving identity, replies, revisions, Audit, and Outbox history.
9. Current revision history is author-only. Staff access arrives with the
   Moderation package.
10. No user HTML is accepted. New structured input must validate as the
    `COMMENT` profile; `body` is a compatibility input and derived projection.
11. Every revision stores its own immutable canonical document and projections.

## GraphQL pilot

- `commentsForTarget(interactionTargetId, parentId, pagination)`;
- `createComment(input)`;
- `editComment(input)`;
- `removeComment(commentId, reason)`;
- `commentRevisions(commentId)`.

Passing no `parentId` lists top-level comments. Passing a top-level comment id
lists its replies.

`CreateCommentInput` and `EditCommentInput` accept exactly one of
`documentJson` or legacy `body`. Responses retain `body` for old clients and
add `documentJson` as the canonical contract. New clients must send
`documentJson`.

## Upgrade safety

Migration `20260802113000_add_comment_editor_documents` wraps every existing
active body and revision body in a valid paragraph-based `COMMENT` document.
It then enforces active document/plain/search consistency and deleted-state
nullability at the database boundary. No historical revision is rewritten by
application code or discarded.

## Deferred packages

- Media Reference ownership synchronization and picker UI;
- mention autocomplete and notification delivery;
- reports and public moderation annotations;
- staff moderation permissions;
- reactions and vote projections;
- comment counters and Activity projections;
- rate limiting and sanction enforcement.
