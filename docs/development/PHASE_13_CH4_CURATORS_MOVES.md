# Phase 13 CH-4 — Curators, moves, merge/split and scoped sanctions

Status: implementation package under review. Stacked on CH-3b
(`phase/13-ch3b-gated-content`); not an accepted baseline.

## Owner rules implemented

| Rule                                                                                                                                                                     | Implementation                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| One curator per topic, appointed by a moderator of the topic's category                                                                                                  | `setForumTopicCurator` (assign, replace, remove)                           |
| Moderators move topics to the archive/trash or between forums (own scope)                                                                                                | CH-1b moves + `moveForumTopic` (scope in both)                             |
| Moderators merge and split topics; move posts to another topic                                                                                                           | `mergeForumTopics`, `splitForumTopic`, `moveForumPosts`                    |
| Curator moves with the topic; the appointing moderator then loses authority over it; the target category moderator or a supermoderator may replace or remove the curator | authority is always category-scoped                                        |
| A read-only curator stays curator until staff decide                                                                                                                     | curatorship is not tied to sanctions                                       |
| Curators issue verbal warnings in their topic; moderators warnings and read-only; all go to the private sanctions journal                                                | `warnForumPostAuthor`, `restrictForumPostAuthor` via M-0 `SANCTION_ISSUER` |

## Relocation rules

- Every affected topic is locked in id order inside one transaction.
- Moved posts are renumbered after the target's last number in their original
  order; `replyToNumber`/`quotedNumbers` that point inside the moved set are
  remapped, references to posts left behind are dropped.
- Each moved post keeps `originalTopicId` / `originalNumber` (first origin
  wins across repeated moves).
- Post #1 never moves alone; merge moves every post.
- Counters, last activity and the post #1 rating mirror are recomputed for both
  topics; an accepted answer that leaves its topic is cleared.
- Moving a topic between forums drops its tags (tags are curated per forum).
- Moves can leave numbering gaps in the source topic; numbers stay unique.

## Merge

The source topic becomes a redirect: `mergedIntoTopicId`, no posts, closed (or
still trashed), no rating, answer, tags or curator. It disappears from every
listing; its Interaction Target, bookmarks and poll stay with it.

## Split

A new topic is created in the same forum; its first post is the first selected
reply, its author is that post's author, its kind is `DISCUSSION`.

## Sanctions

Forum checks scope (topic curator for warnings; category moderator for
warnings and read-only) and then calls Moderation's `SANCTION_ISSUER` with the
context `forum.post` and a site path to the post. Moderation enforces
self-sanction, staff protection, policy bounds and escalation (three warnings →
read-only).

## Deferred

Reports on individual posts: the existing report flow targets Interaction
Targets (topics) and comments; per-post reporting is part of CH-5 integration.

## Verification

- forum e2e for operations: curator scope, moves with curator retention and
  scope loss, post moves with renumbering/remapping/origins, merge redirect and
  listing exclusion (including HOT), split, scoped sanction routing;
- lint and typecheck clean.

Recorded local results (2026-11-21, Node 24.22.3, dedicated `5435`/Redis `6381`):

- migrations applied; zero Prisma schema drift; application boot passes;
- API unit suite: 1662 passed, 106 skipped by the existing opt-in policy;
- forum e2e (all seven suites): 41/41;
- full API e2e: 91 suites, 983/983 (five Redis-6380-pinned suites excluded;
  covered by PR #192);
- architecture inventory: 0 findings.

GitHub CI on the committed PR head remains the acceptance gate.

🧭 Posts may change rooms; they always remember where they were born.
