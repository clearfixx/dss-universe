# Phase 13 CH-2 — Content ratings, ranking, views and unread

Status: implementation package under review. Stacked on CH-1b
(`phase/13-ch1b-moderation-lifecycle`); not an accepted baseline.

## Owner decisions applied

Decision 6 was corrected by the owner on 2026-11-20:

- a forum vote rates the **content**, never its author;
- votes never change user reputation and never award Community Points;
- user reputation changes only through direct profile reputation (mandatory
  reason, 24-hour rule), so the Reputation invariant "content votes do not
  implicitly mutate direct reputation" holds;
- every post has its own rating; the topic rating is the rating of post #1;
- hot/top ranking uses the topic rating.

Unchanged vote rules: registered users with an account age of at least
7 days for `+` and `−`; no reason; one vote per voter per post; no self-vote;
votes are final (no change, no withdrawal); moderators may reverse a vote with
a reason; no votes in closed, archived or trashed topics; display
`70 (80 + / 10 −)` with a dialog listing every voter and their vote.

## Scope

- `forum_post_votes`: primary key (post, voter); value ±1; final — a database
  trigger rejects deletes and every change except one moderator reversal;
- rating counters on posts, mirrored onto the topic for post #1;
- `voteForumPost`, `reverseForumPostVote`, `forumPostVotes` (voter dialog);
- sorting `LAST_ACTIVITY` (default), `NEW`, `HOT`, `TOP` with
  `DAY`/`WEEK`/`MONTH`/`YEAR`/`ALL` periods; pinned topics always first;
- `forum_ranking_settings` (administrator-configurable hot parameters);
- unique topic views for signed-in users (`recordForumTopicView`);
- per-user unread state (`markForumTopicRead`, `viewerLastReadNumber` on
  topics; reading never moves backwards).

## Hot formula

```text
hot = sign(s) · log10(max(|s|, 1))
    + replyWeight · log10(max(posts, 1))
    + createdAtSeconds / gravitySeconds
s = ratingUp − ratingDown
```

Defaults: `gravitySeconds = 45000`, `replyWeight = 0`. Each tenfold rating is
worth one gravity period of recency. Administrators (`forum.structure.manage`)
may set gravity between 1 hour and 30 days and the reply weight between 0
and 10. Ranking is computed in SQL for the requested page.

## Boundaries

- Vote eligibility reads account age through `FORUM_ACCOUNT_EVIDENCE`, bound
  in root composition to Auth's published account evidence; Forum never reads
  account rows.
- Reputation and Community Points are untouched; e2e asserts that voting
  creates no reputation or points ledger rows.
- View and read markers are not content writes: they stay available to
  read-only users (`@PermittedWhileReadOnly`).

## Decisions taken in this package (reviewable)

- **Guests are not counted in views.** Counting anonymous visitors uniquely
  would require fingerprinting (IP/user agent) that the privacy rules avoid.
  Views therefore mean "distinct signed-in readers".
- Views are written on first view only (insert-or-ignore), which already makes
  the write cheap; a Redis buffer can be added later without changing the API.

## Verification

- Prisma format/validate and zero schema drift;
- rating rule unit tests (eligibility, 7-day boundary, values, hot ordering,
  top periods, settings bounds);
- migrated-database e2e: ratings mirrored to the topic with no reputation or
  points rows, one final vote under concurrency, eligibility, voter dialog and
  moderator reversal, TOP/HOT ordering with pinning, unique views and monotonic
  unread state.

Recorded local results (2026-11-21, Node 24.22.3, dedicated `5435`/Redis `6381`):

- migrations applied; zero Prisma schema drift;
- API unit suite: 1658 passed, 106 skipped by the existing opt-in policy;
- forum e2e (structure, topics, moderation, ratings) and schema alignment: 29/29;
- full API e2e: 88 suites, 968/968. Five Redis-guarded suites (`queue`,
  `gamification-broker`, `gamification-activation`,
  `gamification-consumption`, `media-intake-concurrency`) were excluded because
  `main` pins them to Redis `6380`; with the allowlist from PR #192 they pass
  37/37 on `6381`;
- architecture inventory: 0 findings; lint and typecheck clean.

GitHub CI on the committed PR head remains the acceptance gate.

⭐ Rate the words, not the writer.
