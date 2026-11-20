# Phase 13 CH-5b — Forum in Search and Activity

Status: implementation package under review. Stacked on CH-5a
(`phase/13-ch5a-integrations`); not an accepted baseline.

## Owner rules implemented

| Rule                                                         | Implementation                                                                                |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Forum is a source in the shared search, like News and RL     | `FORUM` value of `SharedSearchSource`, `FORUM_SEARCH_SOURCE` (`PrismaForumSearch`)            |
| Hidden categories are invisible to viewers without access    | categories pre-filtered with `canSeeCategory` before the query                                |
| Hidden content must never leak through search                | posts with Content Gate blocks never match and never supply excerpts                          |
| Trashed, merged, hidden, deleted and purged content is gone  | only OPEN/CLOSED/ARCHIVED unmerged topics and VISIBLE posts take part                         |
| Activity shows topic created, reply created, answer accepted | worker projects `forum.topic.created.v1`, `forum.post.created.v1`, `forum.answer.accepted.v1` |
| Activity never shows what the viewer cannot see now          | read-time `ACTIVITY_SUBJECT_VISIBILITY` check, batch, fail closed                             |

## Boundaries

- Forum publishes `FORUM_SUBJECT_VISIBILITY` from the dependency-free
  `ForumFactsModule`; Activity consumes it through its own
  `ACTIVITY_SUBJECT_VISIBILITY` port bound in root composition
  (`activity-subject-visibility.adapter.ts`). Activity filters both the feed
  and the per-actor list; subjects of modules without an owner check pass as
  before.
- Forum events now carry `authorId` (topic, post, accepted answer). The
  projector accepts Forum events only from producer `dss.api.forum` and stores
  `MEMBERS` visibility; the final decision is always the read-time check, so a
  topic moved into a hidden category, trashed or merged disappears from feeds
  without rewriting history.
- Search uses `ILIKE` on titles and stored `searchText`; a trigram index is a
  follow-up once volumes justify it. Results link to the topic id
  (`slug = id`, `language = und`).
- The `authorId` payload field is also the recipient key planned for Forum
  Community Points (`PHASE_13_FORUM_POINTS_PRODUCER_DESIGN.md`); points stay
  dormant until the owner approves that design.

## Verification

- Activity unit tests with the new visibility filter (26/26), worker projector
  tests for the three Forum events and foreign producers (6/6);
- migrated-database e2e `forum-search-activity`: title/body matching with
  excerpts, restricted/trashed/gated content never returned, Activity subjects
  confirmed against current visibility (restricted, hidden post, unknown,
  trashed);
- application boot e2e confirms the wiring has no dependency cycle;
- lint, typecheck and architecture checks clean;
- full API e2e (5435/6381, Redis-6380-pinned suites excluded): 984/990 on the
  first run. The six failures were Activity e2e fixtures that inserted
  synthetic `FORUM` rows with nonexistent subjects, now correctly hidden by the
  fail-closed owner check; the fixtures use the unchecked `BLOG` module and
  both suites pass 20/20.

🔎 Find the discussion, never the secret.
