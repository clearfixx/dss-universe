# Phase 8 — Leaderboards Foundation

## Status

Implemented after Reputation, Community Points, Levels, Custom Titles, and
Achievements.

## Decision

The DSS Universe leaderboard is a read projection of Community Points.

```text
immutable Community Points entries
  → calendar-window sum
  → deterministic position
  → explanatory profile metadata
```

There is no independent score column and no weighted combination of reputation,
level, achievements, posts, or administrator preference.

## Time windows

The API supports the approved periods:

- current UTC month;
- current UTC year;
- all time.

Both positive entries and compensating negative entries are included according
to their ledger `occurredAt` timestamp. Consequently, moderation corrections
remain visible in the period in which the correction happened, while all-time
always represents the current explainable balance.

Each request captures one `endsAt` timestamp. Period totals, all-time level
enrichment, reputation metadata, viewer rank, and page rows are evaluated
against that boundary.

## Participants and ordering

Every active account participates. A member without ledger activity has zero
points, which keeps the leaderboard compatible with the full Members Directory.
Deactivated accounts are omitted.

Positions use:

1. period Community Points descending;
2. account creation timestamp ascending;
3. immutable user id ascending.

Account age is only a deterministic tie-break. It is not converted into points
and cannot overtake a member with a higher Community Points balance.

## Card projection

A result card contains:

- privacy-safe public identity;
- period rank and Community Points;
- all-time current level;
- all-time reputation;
- active selected custom title.

Only Community Points determine rank. Other values are labels and context for
the approved Members Directory design.

## Pagination and viewer context

The query accepts a page size from 1 to 100 and returns total participants,
total pages, period boundaries, and generation time.

The authenticated viewer receives their own rank and period score even when
their card is outside the requested page. This permits the interface to keep a
"your position" row visible without loading every preceding page.

## Performance strategy

The foundation deliberately favors correctness and rebuildability:

- authoritative ledger aggregation;
- range-first Community Points and Reputation indexes;
- one SQL snapshot for page and viewer context;
- no mutable cached balance.

When production measurements justify caching, the next implementation may use
a materialized/rebuildable projection refreshed from ledger events. Cache loss
must never lose points or change the canonical result.

## Security boundaries

- query requires authentication;
- rank never grants roles, groups, permissions, Premium, or moderation power;
- Community Points daily caps remain the anti-spam boundary;
- no write operation is exposed by Leaderboards;
- public card fields are limited to the established member identity surface.

## Verification

Coverage proves:

- UTC month/year boundaries;
- invalid pagination rejection;
- month, year, and all-time differences;
- deterministic ties;
- zero-point inclusion;
- exclusion of deactivated users;
- compensating entries affecting the correct window;
- viewer rank outside the requested page;
- GraphQL authentication.

## Next boundary

The Phase 8 frontend may compose Leaderboards, Levels, Titles, Achievements,
Reputation, and Community Points history. It must retain the same rule:

> Community Points determine position; everything else explains the astronaut.
