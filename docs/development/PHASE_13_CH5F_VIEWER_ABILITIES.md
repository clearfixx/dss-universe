# Phase 13 CH-5f — Topic viewer abilities

Status: implementation package under review, from `main`. Needed by the forum
moderation UI: moderators are assigned per category, so the client could not
tell which actions to offer.

## Added field

`ForumTopic.viewerAbilities` → `ForumTopicViewerAbilities`:

| Field          | True when                                                                      |
| -------------- | ------------------------------------------------------------------------------ |
| `moderate`     | the viewer moderates all categories, sees all, or is assigned to this category |
| `purge`        | the viewer may remove content permanently (administrators)                     |
| `acceptAnswer` | question topic; author, curator or moderator; changing an answer: moderator    |
| `close`        | `canCloseTopic` (open topic; author, curator or moderator)                     |
| `reopen`       | `canReopenTopic` (closed topic; curator or moderator)                          |
| `reply`        | signed in and the topic is open (read-only mode: `viewerSanctionStatus`)       |

- Hints only: every command still checks its own rule. `close`/`reopen` reuse
  the domain rules the commands use.
- Batched per request: one viewer-facts read, one assignment query, one forum →
  category query, whatever the number of topics.

## Verification

- `forum-viewer-abilities` e2e: guest, member, author, category moderator,
  moderator of another category, administrator; open and closed topics;
- all forum e2e suites 65/65; app boot (schema regenerated); lint, typecheck
  clean; architecture check 142/142, inventory 0 findings; `graphql:check`.

🧭 The buttons you see are the buttons you may press.
