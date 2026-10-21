# Community Points Module Passport

## Purpose

Community Points measure explainable participation in DSS Universe. They are
derived from approved integration events and remain separate from direct
Reputation, reactions, permissions and titles.

## Architecture

```text
Owning Domain
  → Integration Event
  → CommunityPointsService
  → Configurable Rule + Daily Cap
  → Immutable Ledger
  → Audit + Outbox
  → Balance / Levels / Leaderboards
```

## Rules

- events are consumed idempotently;
- balances are derived from ledger values;
- weights and UTC-day award limits are configurable;
- content removal, moderation and unpublishing append compensating entries;
- ledger rows cannot be updated or deleted;
- controllers and owning feature modules never assign points directly;
- direct Reputation remains a separate trust ledger.

## Initial rules

| Activity                          | Points | Default daily limit |
| --------------------------------- | -----: | ------------------: |
| Comment                           |     +1 |                  50 |
| Community Hub topic               |     +5 |                  10 |
| Published News article            |    +10 |                   5 |
| Published Knowledge Forge article |    +50 |                   2 |
| Direct reputation `+1`            |    +10 |                  25 |
| Direct reputation `-1`            |    -10 |                  25 |

The limits are anti-abuse defaults, not hard-coded product policy. Mission
Control may change them through permission-backed settings.

## Future consumers

Levels, achievements and leaderboards consume the ledger projection. They do
not invent a second points balance.

> The scoreboard may be exciting. The audit trail is what keeps it honest.
