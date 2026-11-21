# Phase 13 CH-5a — Subscriptions, News discussions and the FORUM_POSTS fact

Status: implementation package under review. Stacked on CH-4
(`phase/13-ch4-curators-moves`); not an accepted baseline.

The brainstorm's CH-5 is delivered in parts:

- **CH-5a (this package):** topic subscriptions, News discussion links,
  the `FORUM_POSTS` Content Gate fact;
- **CH-5b:** Forum as a viewer-safe Search source and Activity events;
- **Community Points** for topics, replies and accepted answers need a
  qualified-producer design like Reputation P1 (DEBT-090); this is raised with
  the owner and not part of CH-5a.

## Owner rules implemented

| Rule                                                                       | Implementation                                                          |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1.0 supports subscriptions to topics only                                  | `forum_topic_subscriptions`                                             |
| Delivery of notifications comes in Phase 15                                | Forum only records intent; `forum.post.created.v1` events already exist |
| A News article links to one canonical discussion topic; News comments stay | `forum_news_discussions` (one topic per article, one article per topic) |
| Linking: article author, target category moderator, supermoderator, admin  | `requireLinkAuthority`                                                  |
| The News page shows the link only after Forum verifies and stores it       | `newsDiscussionTopic` returns the topic only if the viewer can see it   |
| Link and unlink are audited                                                | audit + `forum.news_discussion.(un)linked.v1`                           |
| `FORUM_POSTS` counts topics only, in public forums                         | `PrismaForumTopicCounts`; trashed/merged excluded                       |
| Notify moderators after creating a discussion                              | debt until Phase 15                                                     |

## Boundaries

- News publishes a new narrow contract `NEWS_DISCUSSION_FACTS` (author,
  published-now) from the dependency-free `NewsDiscussionFactsModule`; Forum
  consumes it through its own `FORUM_NEWS_FACTS` port bound in root
  composition.
- Forum publishes `FORUM_TOPIC_COUNTS` from the dependency-free
  `ForumFactsModule`; Content Access consumes it through
  `GATE_FORUM_POST_COUNT`, replacing the former hard-coded zero.
- Both small modules exist because the global composition module cannot import
  the full News or Forum modules: they depend on its own ports, which made the
  application hang at start-up during development. The application boot e2e
  now guards this.
- Subscribing is not a content write and stays available to read-only users.

## Verification

- Content Access unit tests: the fact now comes from Forum (60/60);
- migrated-database e2e: idempotent subscriptions, link authority and
  replacement, one-topic-per-article conflict, unpublished articles rejected,
  unlink with events, visibility-aware discussion link, public-only topic
  counting; gate/wall owner evidence e2e through the real application;
- lint and typecheck clean;
- full API e2e on the dedicated PostgreSQL 5435 / Redis 6381 (Redis-6380-pinned
  suites excluded until #192 lands): 986/987 tests, 90/92 suites. The two
  failing suites (`qualified-points`, `achievement-qualification-storage`)
  hit 5 s hook/test timeouts while lint and typecheck ran in parallel on the
  same machine; rerun alone they pass 32/32.

🔗 Every article deserves one place to talk about it.
