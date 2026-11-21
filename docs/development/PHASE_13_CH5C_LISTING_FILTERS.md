# Phase 13 CH-5c — Topic list filters and personal lists

Status: implementation package under review. Stacked on CH-3c
(`phase/13-ch3c-forum-media`); not an accepted baseline. Small API additions
the forum UI needs (owner-approved list, 2026-11-21).

## What changed

| Need                                 | API                                                             |
| ------------------------------------ | --------------------------------------------------------------- |
| "My topics" in a forum               | `forumTopics(filter: MINE)` — signed-in only                    |
| Topics nobody has replied to         | `forumTopics(filter: NO_REPLIES)` — `postCount = 1`             |
| Questions without an accepted answer | `forumTopics(filter: UNSOLVED)`                                 |
| Topics I follow, across the forum    | `viewerForumTopics(collection: SUBSCRIBED)`                     |
| My topics, across the forum          | `viewerForumTopics(collection: AUTHORED)`                       |
| Moderator trash list                 | already present: `forumTopics(scope: TRASHED)`, moderators only |

- Filters work with every sort, including the ranked HOT and TOP queries, and
  combine with `scope`, `tagSlug` and `topPeriod`.
- Personal lists use the same visibility rules as browsing: topics in
  categories the viewer can no longer see, inactive forums, trashed and merged
  topics are left out; archived topics stay. Order: last activity.
- "Unanswered" is ambiguous, so both meanings are offered: `NO_REPLIES` and
  `UNSOLVED`; the UI picks per tab.

## Verification

- `forum-listing-filters` e2e (2): each filter in LAST_ACTIVITY and HOT, MINE
  needs sign-in; AUTHORED and SUBSCRIBED across forums, restricted topics
  disappear after losing access, trashed topics disappear;
- all forum e2e suites 58/58 after a test-only cooldown fix; app boot e2e
  (schema adds `ForumTopicFilter`, `ForumViewerCollection`,
  `viewerForumTopics`); Forum unit 48/48; lint, typecheck clean; architecture
  inventory 0 findings.

🗂️ The same topics, sliced the way people look for them.
