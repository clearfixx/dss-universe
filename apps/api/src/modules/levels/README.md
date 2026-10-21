# Levels Module Passport

## Purpose

Levels present long-term participation progress derived exclusively from the
Community Points ledger.

```text
Community Points balance
  → Configurable thresholds
  → Current level + progress
  → Immutable UP / DOWN transition history
```

## Rules

- Level 0 is implicit below the first configured threshold.
- Community Points remain the only authoritative balance.
- Thresholds are positive, contiguous and strictly increasing.
- One points event may cross several levels; each crossing is recorded.
- Point reversals may produce downward transitions.
- Transition rows cannot be updated or deleted.
- Threshold changes affect current progress immediately but never rewrite
  historical transitions.
- Levels and custom titles remain separate; levels grant no permissions.

## Initial thresholds

The initial curve preserves the approved anchors:

- Level 1: 10 points;
- Level 2: 50 points;
- Level 15: 5000 points.

Intermediate thresholds form a gradual curve and remain configurable through
Mission Control.

## GraphQL

- `levelProgress(userId)`;
- `levelDefinitions`;
- `levelHistory(userId, pagination)`;
- `updateLevelDefinition(input)` guarded by `levels.settings.manage`.

> The level is the view from the window. Community Points are the flight log.
