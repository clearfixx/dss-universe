# Phase 8 — Direct Reputation Ledger

## Status

```text
FOUNDATION DELIVERED
```

## Ownership

The Reputation module owns direct user-to-user `+1` and `-1` decisions.
Reputation is deliberately separate from:

- Community Points and levels;
- reactions or votes on content;
- roles, groups and titles;
- moderation sanctions.

No content reaction changes reputation implicitly. Another domain may request a
reputation write only through an explicit, audited rule.

## Ledger model

Every direct decision appends an immutable record containing:

- actor and recipient;
- value (`+1` or `-1`);
- mandatory public reason;
- creation time.

A reversal never updates or deletes the original record. It appends a
compensating entry with the opposite value, moderator identity, reason and a
unique reference to the original. PostgreSQL triggers reject `UPDATE` and
`DELETE` operations on ledger records.

The current score is rebuildable:

```text
score = sum(all original and compensating ledger values)
```

## Safety policy

- self-rating is rejected;
- only active users may exchange reputation;
- blocked users cannot exchange reputation;
- minimum actor account age is configurable from 0 to 3650 days;
- one actor may rate the same recipient once per rolling 24 hours;
- actor-to-recipient writes use a PostgreSQL advisory transaction lock so
  concurrent requests cannot bypass the cooldown.

The default minimum account age is seven days.

## Permissions

- normal authenticated users may give direct reputation;
- `reputation.reverse` permits compensating reversals;
- `reputation.settings.manage` permits policy changes;
- moderators receive reversal permission;
- administrators and owners receive reversal and policy permissions.

Role names are never checked in business code.

## GraphQL contract

Reads:

- `reputationHistory(userId, pagination)`;
- `reputationPolicy`.

Writes:

- `giveReputation(input)`;
- `reverseReputation(input)`;
- `updateReputationPolicy(input)`.

History exposes current actor identity, public reason, value and reversal
details. Audit and Outbox evidence commit in the same transaction as each
ledger append.

## Deferred Phase 8 packages

- Community Points ledger and idempotent event awards;
- level thresholds and progress;
- titles and title selection cooldown;
- achievements;
- time-window leaderboards and Members Directory ranking;
- additional anti-abuse signals and configurable caps.

Reputation explains trust. Community Points explain participation. They share a
phase, not a database meaning.
