# Phase 13 CH-5d — Forum read models for the UI

Status: implementation package under review, from `main`. Found while
building the forum web data layer: the API returned only IDs where every forum
screen needs names, the viewer's own vote and forum counters.

## Added GraphQL fields

| Field                                            | Meaning                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `ForumTopic.author`, `ForumTopic.lastPostAuthor` | `ForumMember` card: id, username, displayName, avatarUrl                                         |
| `ForumPost.author`, `ForumPostVote.voter`        | same card                                                                                        |
| `ForumPost.viewerVote`                           | the signed-in viewer's active vote: `1`, `-1` or `null`                                          |
| `Forum.activity`, `ForumSubforum.activity`       | `topicCount`, `postCount`, `lastActivity { topicId, title, lastPostAt, lastPostNumber, author }` |

- Counters include open, closed and archived topics; trashed and merged topics
  never count. `lastActivity` is the topic with the latest post.
- A reversed vote reads as `null`; voting remains final as before.
- Cards expose public identity only (no e-mail, roles or other private data).

## Boundaries and performance

- Forum owns the consumer port `FORUM_MEMBER_CARDS`; root composition binds it
  (`content-reads/infrastructure/forum-member-cards.adapter.ts`) to the same
  public profile fields News delivery uses.
- Every field is batched per request with DataLoader keyed on the request: one
  card query, one vote query and one stats query per response, whatever the
  page size. Parents were authorized by their own queries.

## Verification

- `forum-read-models` e2e (3): counters exclude trashed topics and name the
  latest replier, empty forums read zero; only active votes are returned and
  cards carry exactly four public fields; one query per kind for a whole
  request, guests get no votes;
- all forum e2e suites 61/61; Forum and content-read unit 100/100; app boot
  (schema regenerated); `graphql:check`; lint, typecheck clean; architecture
  check 142/142, inventory 0 findings.

🪪 Names next to words, counts next to forums.
