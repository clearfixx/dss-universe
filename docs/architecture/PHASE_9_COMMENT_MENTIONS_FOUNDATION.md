# Phase 9 — Comment Mentions & Notification Integration Foundation

## Outcome

Comments recognize bounded `@username` references and persist their active
recipient relationships. Mention lifecycle changes commit atomically with
comment creation, editing, or tombstoning.

## Ownership

Comments owns extraction and mention state because a mention belongs to a
comment revision. Notifications owns the future inbox, unread, grouping,
email, realtime and delivery policy.

```text
Comment command
      ↓
CommentsService extracts bounded usernames
      ↓
PrismaCommentsRepository resolves active recipients
      ↓
Comment + Mention + Audit + Outbox transaction
      ↓
Phase 15 Notifications consumer and delivery policy
```

## Data rules

- a comment may actively mention at most 20 unique usernames;
- matching is case-insensitive and supports Unicode letters and numbers;
- email-address fragments are not parsed as mentions;
- unknown, inactive and self usernames create no mention;
- one durable mention identity exists per comment and recipient;
- removing a username retracts the relationship instead of deleting history;
- adding the username again reactivates the relationship with a new
  `activatedAt`;
- target, comment, actor and recipient use real foreign keys;
- recipient usernames are never copied into mention rows.

## Integration events

Real transitions emit:

- `notifications.mention.created.v1`;
- `notifications.mention.retracted.v1`.

The payload contains identifiers only: mention, comment, interaction target,
actor and recipient. It never contains the comment body, email address or
request metadata.

These events are delivery requests, not notifications themselves. A later
consumer applies preferences, grouping, retries and channel policy.

## GraphQL

Visible comments expose `mentionedUserIds`. Target-owner READ policy continues
to guard comment queries, so mention metadata cannot bypass content
visibility.

## Deferred work

- DSS Editor mention nodes and autocomplete;
- notification inbox and unread state;
- preference-aware event consumer;
- email and realtime delivery;
- mentions produced by News, Community Hub, Research Lab, Knowledge Forge and
  Academy documents.

## Verification

- full migration history applies on an isolated PostgreSQL database;
- unit tests cover extraction and normalization;
- E2E covers creation, GraphQL projection, edit retraction and exact Outbox
  transition count.

> Mentions carry coordinates, not cargo. The notification system decides how
> the signal travels.
