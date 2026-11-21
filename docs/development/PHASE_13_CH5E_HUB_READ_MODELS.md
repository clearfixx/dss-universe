# Phase 13 CH-5e — Community Hub read models

Status: implementation package under review, from `main`. Gaps found while
designing the Community Hub home page against the owner's mockups ("Центр
спільноти", forum overview): blocks that span all forums had no API.

## Added queries

| Query                                                                                    | Use on the hub                                                                       |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `forumDiscoverTopics(filter: ALL \| NO_REPLIES \| UNSOLVED, sort: NEW \| LAST_ACTIVITY)` | "Needs help" (questions without an accepted answer), "No replies yet", newest topics |
| `forumHubStats` → `forumCount`, `topicCount`, `postCount`, `participantCount`            | hero counters                                                                        |
| `forumPopularTags(limit)` → `slug`, `label`, `topicCount`                                | popular tags block                                                                   |

- Every query works for guests and applies the same visibility as browsing:
  hidden categories, inactive forums, trashed and merged topics never count.
- Discovery lists open and closed topics; totals include archived topics.
- Posts and participants count visible posts only.
- Tags are curated per forum, so popular tags merge by slug across forums.
- Members and online counts already exist (`members`, presence) and are not
  duplicated here.

## Verification

- `forum-hub-read-models` e2e (3): unsolved/no-replies discovery for guests and
  for a member of a restricted group, trashed and solved topics excluded; hub
  totals per viewer; tags merged by slug with restricted usage hidden;
- all forum e2e suites 64/64; app boot (schema regenerated); lint, typecheck
  clean; architecture check 142/142, inventory 0 findings; `graphql:check`.

🛰️ One look at the hub tells where help is needed.
