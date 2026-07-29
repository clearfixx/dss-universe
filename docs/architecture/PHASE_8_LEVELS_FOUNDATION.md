# Phase 8 — Levels Foundation

## Status

Implemented as the third Phase 8 package.

## Boundary

Levels are a presentation and history projection of Community Points.

```text
Community Points ledger
  → derived balance
  → configurable thresholds
  → current level and progress
  → immutable UP / DOWN transition history
```

There is no `xp`, `points` or `level` column on `User`. This prevents competing
sources of truth and keeps every result rebuildable.

## Initial scale

Level 0 is implicit for balances below the first threshold. The persisted
initial curve preserves the approved product anchors:

| Level | Points | Level | Points | Level | Points |
| ----: | -----: | ----: | -----: | ----: | -----: |
|     1 |     10 |     6 |    550 |    11 |   2300 |
|     2 |     50 |     7 |    800 |    12 |   2800 |
|     3 |    100 |     8 |   1100 |    13 |   3400 |
|     4 |    200 |     9 |   1450 |    14 |   4100 |
|     5 |    350 |    10 |   1850 |    15 |   5000 |

Mission Control may update a threshold or append a contiguous next level.
Thresholds must remain positive, unique and strictly increasing.

## Progress contract

`levelProgress` returns:

- Community Points balance;
- current level and its threshold;
- next level and its threshold;
- points earned inside the current interval;
- points still required;
- bounded percentage from `0` to `100`.

Negative balances remain at implicit Level 0. A user above the highest
configured threshold receives `100%` with no next level.

## Transition history

Community Points award and reversal events trigger idempotent projection sync.
A PostgreSQL advisory lock serializes transitions for each user.

When one event crosses several thresholds, every crossing is appended:

```text
0 → 1 → 2 → 3
```

A reversal may append the opposite path:

```text
3 → 2 → 1 → 0
```

PostgreSQL triggers reject transition updates and deletes. Historical
achievements remain visible even if the current balance later decreases.

Threshold changes affect current progress immediately. They do not rewrite old
transitions; the next Community Points event reconciles the transition
projection against the current scale.

## Idempotency and evidence

- stable `(eventId, dss.api.levels)` processed markers;
- a repeated event cannot duplicate transitions;
- per-user advisory transaction locks protect concurrent delivery;
- transition rows, Audit records and `levels.changed.v1` Outbox events commit
  together.

## GraphQL

Authenticated contracts:

- `levelProgress(userId)`;
- `levelDefinitions`;
- `levelHistory(userId, pagination)`;
- `updateLevelDefinition(input)` guarded by `levels.settings.manage`.

Levels grant no permissions and remain separate from custom titles.

## Verification

The package covers:

- Level 0, intermediate progress and highest-level behavior;
- concurrent duplicate delivery;
- multi-level upward and downward transitions;
- Community Points reversal;
- monotonic threshold policy;
- GraphQL progress, history and settings;
- database-level immutability;
- clean application of the full migration chain.

## Next boundary

Custom titles add configurable presentation badges without changing levels,
roles, groups or permissions.

> Community Points record the journey. Levels mark the milestones.
