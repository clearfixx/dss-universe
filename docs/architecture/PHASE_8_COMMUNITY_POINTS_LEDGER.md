# Phase 8 — Community Points Ledger Foundation

## Status

Implemented as the second Phase 8 package.

## Boundary

Community Points measure participation. They do not represent trust,
permissions, reactions or an opaque AI score.

```text
Domain Event
  → Community Points rule
  → idempotency + daily cap
  → immutable ledger entry
  → Audit + Outbox
  → balance projection
  → future levels and leaderboards
```

The authoritative balance is always the sum of ledger values. A cached or
materialized balance may be added later, but it must remain rebuildable.

## Event rules

The initial rules are persisted policy rather than hard-coded controller
behavior:

| Rule                          | Event                             | Weight |
| ----------------------------- | --------------------------------- | -----: |
| `comment.created`             | `comments.comment.created.v1`     |     +1 |
| `forum.topic.created`         | `community.topic.created.v1`      |     +5 |
| `news.published`              | `news.article.published.v1`       |    +10 |
| `knowledge.article.published` | `knowledge.article.published.v1`  |    +50 |
| `reputation.positive`         | `reputation.direct.changed.v1` +1 |    +10 |
| `reputation.negative`         | `reputation.direct.changed.v1` -1 |    -10 |

Each rule has an enabled flag and optional UTC-day award limit. Mission Control
may change weights and limits through `community-points.settings.manage`.
Changing a rule affects future events only and never rewrites historical
entries.

## Idempotency and concurrency

Each handled integration event is serialized by a PostgreSQL advisory
transaction lock. The award and stable `(eventId, consumerName)` marker are
committed together.

Therefore:

- concurrent delivery of one event creates at most one award;
- retries return `DUPLICATE`;
- capped events are also marked processed and cannot become retroactive awards
  after a later policy change;
- source-revocation tombstones prevent a delayed award when reversal arrives
  before its original event;
- an event outside configured rules is ignored.

## Reversals

Entries cannot be updated or deleted. PostgreSQL triggers enforce this.

Content removal, unpublishing, moderation and direct-reputation reversal append
the exact negative value of the original entry. The reversal preserves:

- original entry identity;
- correcting actor when available;
- mandatory reason;
- occurrence time;
- Audit and Outbox evidence.

`community-points.reverse` permits a moderator to append a correction. It does
not grant arbitrary point creation.

## GraphQL

Authenticated contracts:

- `communityPointsHistory(userId, pagination)`;
- `communityPointRules`;
- `reverseCommunityPoints(input)` with permission guard;
- `updateCommunityPointRule(input)` with permission guard.

Feature controllers do not expose a mutation for arbitrary awards. Approved
integration events are the earning boundary.

## Verification

The package covers:

- event/rule routing and validation;
- duplicate concurrent delivery;
- daily cap enforcement;
- public explainable history and derived balance;
- permission-backed compensating reversal;
- database-level update rejection;
- clean application of the full migration chain.

## Next boundary

Levels consume Community Points balances and configurable thresholds. They must
not introduce a second authoritative points column.

> Reputation explains trust. Community Points explain participation. Levels
> present progress.
