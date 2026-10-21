# Leaderboards Module Passport 🏁

## Purpose

Leaderboards provide deterministic community rankings derived from the
Community Points ledger.

They do not award points, modify levels, or calculate an unexplained composite
score.

## Ranking source

```text
Community Points Ledger
  → UTC period projection
  → active member ranking
  → level, reputation, and selected-title enrichment
  → GraphQL page
```

The only ranking value is `communityPoints`.

Level, reputation, and selected title explain the member card but never change
its position.

## Periods

- `MONTH` begins at 00:00 UTC on the first day of the current month;
- `YEAR` begins at 00:00 UTC on January 1 of the current year;
- `ALL_TIME` includes the complete ledger up to the snapshot timestamp.

Every query uses one `endsAt` value so page results, viewer rank, and enrichment
refer to the same logical snapshot.

## Ranking policy

All active users participate, including members with zero points.

Ordering is deterministic:

1. Community Points descending;
2. account creation time ascending;
3. immutable user id ascending.

The stable tie-break avoids moving equally scored members between pages. It
does not create bonus points.

## Public contract

The authenticated `leaderboard` GraphQL query returns:

- a bounded page of member cards;
- rank and Community Points;
- current all-time level;
- all-time reputation as explanatory metadata;
- selected custom title;
- total participants and pages;
- the current viewer's rank and score even when outside the requested page;
- explicit period boundaries and generation timestamp.

## Performance

The foundation reads authoritative ledgers directly and adds range-first
indexes for month/year scans. A rebuildable materialized projection may be
introduced when measured traffic requires it; it must never become the source
of truth.

## Safety

- deactivated accounts are excluded;
- no leaderboard mutation exists;
- no role or permission is derived from rank;
- anti-spam limits remain owned by Community Points rules.

> A podium celebrates participation. It does not grant access to Mission
> Control.
