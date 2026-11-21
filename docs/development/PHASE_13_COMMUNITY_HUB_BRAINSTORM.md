# Phase 13 — Community Hub / Forum brainstorm

Status: owner decisions recorded 2026-11-19; design proposed for review. This
document authorizes no runtime implementation by itself.

## Decision summary

Community Hub is the DSS Universe forum. The UI name is `Community Hub`, the
route is `/community` and the technical module, permission and identifier
prefix is `forum`. It combines the structured organization of classic forums
with per-post voting, question topics and hot/new/top discovery.

The governing product rules are:

1. Topics are flat, chronological threads with quotes and explicit
   `reply to #N` references. Question topics additionally rank answers by score.
2. Forum owns its own `Topic` and `Post` aggregates. It does not extend the
   shared Comments context. Topics and posts register as Interaction Targets
   only for shared bookmarks and reports.
3. Organization is category → forum → at most one level of subforums.
4. A forum vote rates the content, not its author: one click, no reason, one
   vote per voter per post. It never changes user reputation or Community
   Points (owner correction, 2026-11-20).
5. Moderators are scoped to one or more categories; supermoderators are
   moderators of the whole site. Curators are scoped to one topic.
6. Sanctions (verbal warning, read-only) live in a private per-user sanctions
   journal. Public staff notes inside posts are visible marks.
7. Authors never delete their own topics or posts. Deletion is a moderator
   tombstone; restoration has no time limit.
8. Physical purge exists only for administrators with a dedicated permission
   and a mandatory reason (secrets, malware, legal/privacy requests).
9. Category visibility is restricted by user groups. Users without access do
   not see a restricted category at all.
10. Notification delivery is deferred to Phase 15; Forum only emits events.
11. The backend contract is implemented independently of frontend visual
    design.

## Owner decisions

Recorded from the owner's answers on 2026-11-19. Numbers follow the review
question list.

| #   | Topic                    | Decision                                                                                                                                                                                                                          |
| --- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Discussion shape         | Flat chronological topics; question topics rank answers by score                                                                                                                                                                  |
| 2   | Post ownership           | Forum-owned `Topic`/`Post` aggregates, not shared Comments                                                                                                                                                                        |
| 3   | Hierarchy                | Category → forum → one subforum level                                                                                                                                                                                             |
| 4   | Question topics          | Author, curator or moderator marks the accepted answer; only a moderator may change it; answer author receives bonus points; topic is not closed automatically                                                                    |
| 4   | Polls                    | Shared Polls module (also replaces News polls); anonymous/open is configurable per poll; no deadline; a vote cannot be changed                                                                                                    |
| 5   | Tags                     | Curated tag list per forum                                                                                                                                                                                                        |
| 5   | Content Gates in posts   | Allowed only in forums explicitly flagged for gated content                                                                                                                                                                       |
| 5   | Attachments in Downloads | Not shown until Phase 16                                                                                                                                                                                                          |
| 6   | Votes                    | Votes rate content. `+`/`-` on every post; the topic rating is its first post's rating; registered users with account age ≥ 7 days for both; no reason; one vote per voter per post; no self-vote; moderator reversal with reason |
| 6   | Vote effect              | Corrected 2026-11-20: votes change only the content rating — never the author's reputation and never Community Points. User reputation changes only through direct profile reputation (mandatory reason, 24-hour rule)            |
| 6   | Score display            | Net score with breakdown, e.g. `70 (80 + / 10 −)`; clicking opens a dialog with the score scale and the list of voters with their vote                                                                                            |
| 7   | Sorting                  | Topic lists default to last activity; hot/new/top switch; pinned topics always first; hot formula documented with administrator-configurable parameters                                                                           |
| 8   | Community Points         | Topic +5, reply +1, accepted answer +10 (to the answer author). Points are not revoked when a post is deleted                                                                                                                     |
| 8   | Anti-abuse               | Moderators handle farming with read-only. Global cooldown of 60 seconds between new posts by the same user across the whole forum; new accounts use the same cooldown                                                             |
| 9   | Counters                 | Unique views with deferred writes; unread tracking in 1.0                                                                                                                                                                         |
| 10  | Moderator powers         | Within assigned categories: move topics between forums, move to trash or archive, merge/split, close, assign curators; hide, delete, edit and move posts to another topic; issue verbal warnings and read-only                    |
| 10  | Supermoderator           | Moderator of the whole site                                                                                                                                                                                                       |
| 10  | Topic author             | May close (not delete) own topic. May edit the first post only until a curator is assigned                                                                                                                                        |
| 10  | Reply author             | May edit own reply for 10 minutes after publication                                                                                                                                                                               |
| 11  | Verbal warning           | A sanction without restrictions, recorded in the journal, expires after 30 days. Three active warnings automatically apply read-only for 7 days and are consumed. Curator warnings count. Thresholds configurable                 |
| 11  | Curator on topic move    | Curator moves with the topic. The appointing moderator loses authority over the curator; the target category moderator or a supermoderator may replace or remove them                                                             |
| 11  | Sanctioned curator       | Remains curator until moderators/administrators decide otherwise                                                                                                                                                                  |
| 12  | Moderation dependency    | Extract a minimal sanctions core from Phase 14 before Forum (see M-0)                                                                                                                                                             |
| 13  | Deletion                 | Tombstone; ordinary users see "post deleted"; moderators and above see content, actor and reason; unlimited restoration; authors cannot delete own posts                                                                          |
| 13  | Purge                    | Administrators only, with a dedicated permission, mandatory reason and audit                                                                                                                                                      |
| 14  | Archive and trash        | Merge/split in 1.0. Archive is a section: topic closed but visible. Trash: hidden from users, visible and restorable by moderators                                                                                                |
| 15  | News discussion          | News comments and the linked forum topic coexist. Linking is allowed to the article author, the target category moderator, supermoderators and administrators                                                                     |
| 15  | Moderator notification   | Recorded as debt until Phase 15                                                                                                                                                                                                   |
| 16  | Subscriptions            | Topic subscriptions only in 1.0; Forum emits Outbox events, delivery arrives in Phase 15                                                                                                                                          |
| 17  | Search                   | Reuse the DEBT-052/053 viewer-safe search mechanism                                                                                                                                                                               |
| 18  | `FORUM_POSTS` gate fact  | Counts topics only, created in public forums                                                                                                                                                                                      |
| 18  | Category visibility      | Category settings include a visibility section listing allowed user groups. Administrators always see every category and cannot be excluded                                                                                       |
| 19  | Activity Feed            | New topic, reply, accepted answer and poll events                                                                                                                                                                                 |
| 20  | Packages                 | Delivered as ordered packages (below)                                                                                                                                                                                             |
| 21  | Mockups                  | No final mockups yet; reference screenshots are supplied in chat                                                                                                                                                                  |
| F1  | Reopening                | A topic author cannot reopen a closed topic; only curators and staff may                                                                                                                                                          |
| F2  | Vote finality            | A forum vote cannot be changed or withdrawn by the voter; only moderator reversal applies                                                                                                                                         |
| F3  | Votes on inactive topics | No votes on closed, archived or trashed topics or their posts                                                                                                                                                                     |
| F4  | Cooldown exemption       | Moderators, supermoderators and administrators have no cooldown; curators do                                                                                                                                                      |
| F5  | Visibility subjects      | Category visibility may select both Access Groups and system roles                                                                                                                                                                |

## Product model

### Organization

- Category: top-level grouping with ordering, active flag and visibility
  settings.
- Forum: belongs to one category; holds topics, tag list, gated-content flag
  and default sort.
- Subforum: a forum whose parent is a forum; nesting stops at one level.
- Visibility and moderator scope are configured on the category and inherited
  by its forums and subforums.
- `Archive` and `Trash` are system destinations, not ordinary forums.

### Topics

- Kinds: `DISCUSSION`, `QUESTION`; a topic may carry one shared Poll.
- States: `OPEN`, `CLOSED`, `ARCHIVED`, `TRASHED`; pinned is an independent
  flag.
- A topic's first post is its body. Its title, tags and kind belong to the
  topic.
- Question topics have at most one accepted answer.

### Posts

- Sequential number within the topic (`#N`), immutable after creation, kept
  when posts move.
- Canonical Editor JSON using a forum Editor profile: code and Media allowed;
  Content Gate blocks only in gated forums.
- Quotes and `reply to #N` references are structured, not copied HTML.
- Immutable revision history. Public footer: `edited by <user> at <time>`.
- Staff notes: curator, moderator, supermoderator and administrator notes are
  structured blocks inside the post, visually distinguished by role (for
  example a coloured block with the role letter). They are the public
  moderation mark; sanction details stay in the private journal.

### Voting display

- Topics and posts show `net (up + / down −)`.
- The voter dialog lists every voter with nickname, vote and time, plus a
  reversed state when a moderator reversed the vote.

## Ownership and module boundaries

Forum owns:

- categories, forums, subforums, visibility and moderator scope assignments;
- topics, posts, revisions, staff notes, quotes and post numbering;
- tags per forum, pinning, closing, archive/trash, merge/split and moves;
- curators and their topic scope;
- accepted answers;
- unread state and unique views;
- topic subscriptions;
- forum search projection inputs and domain events.

Existing platforms retain ownership:

| Concern                                | Owner               | Forum integration                                                       |
| -------------------------------------- | ------------------- | ----------------------------------------------------------------------- |
| Document schema, validation, rendering | Editor              | New forum profile; canonical JSON and safe projections                  |
| Hidden blocks and viewer eligibility   | Content Access      | Only in gated forums; evaluated before delivery, snippets and counters  |
| Files                                  | Media               | Media IDs/references only                                               |
| Bookmarks and reports                  | Interactions        | `forum.topic` and `forum.post` Interaction Targets                      |
| Content rating votes                   | Forum               | Forum-owned vote ledger; Reputation is not involved                     |
| Points                                 | Community Points    | Qualified, idempotent topic/reply/accepted-answer facts (no vote facts) |
| Polls                                  | Polls (new, shared) | Topic references one poll                                               |
| Group membership                       | IAM/Authorization   | Category visibility and permissions through narrow capabilities         |
| Sanctions, warnings, read-only         | Moderation (M-0)    | Enforced before every write; Forum records context links only           |
| Search                                 | Search composition  | Forum supplies authorized source hits                                   |
| Activity                               | Activity            | Consumes forum events                                                   |
| Notifications                          | Notifications       | Consumes subscription/mention events from Phase 15                      |
| News discussion link                   | Forum               | Forum verifies and persists the link; News renders it                   |

Forum must not import repositories or application services from these
modules. Root composition joins narrow named contracts and owns cross-module
transactions where one atomic boundary is required.

## Authorization

Permission prefix: `forum.`. Names below are proposals for architecture review.

| Actor          | Scope          | Capabilities                                                                                                     |
| -------------- | -------------- | ---------------------------------------------------------------------------------------------------------------- |
| Guest          | Visible public | Read                                                                                                             |
| Member         | Visible        | Create topics/replies, vote (account ≥ 7 days), bookmark, report, subscribe to topics, vote in polls             |
| Topic author   | Own topic      | Close (no reopen); edit first post until a curator is assigned; mark accepted answer                             |
| Reply author   | Own reply      | Edit for 10 minutes                                                                                              |
| Curator        | One topic      | Edit first post, hide/delete replies (tombstone), add curator notes, issue verbal warnings, mark accepted answer |
| Moderator      | Own categories | All topic/post operations, curator assignment, verbal warning, read-only, accepted-answer change, vote reversal  |
| Supermoderator | Whole site     | Moderator capabilities everywhere                                                                                |
| Administrator  | Whole site     | All above, category visibility settings, purge (`forum.content.purge`), configuration                            |

Rules:

- Authority comes from permissions and scope assignments, never from role names.
- A moderator may hold several categories.
- Moderators cannot delete or alter administrator visibility of a category.
- Sanctions are checked before Premium or other group grants.
- Read-only blocks topic/post creation, editing, voting, poll voting and
  uploads, but not reading visible content.

## Lifecycle

### Topic

```text
OPEN ⇄ CLOSED
OPEN/CLOSED → ARCHIVED (closed, visible, moved to Archive)
OPEN/CLOSED/ARCHIVED → TRASHED (hidden from users, restorable)
TRASHED → previous state (restore)
```

Only curators, moderators, supermoderators and administrators may move a
topic from `CLOSED` back to `OPEN`; the author may close but never reopen.

Merge moves all posts of the source topic into the target, keeping post
numbers unique by renumbering in the target and recording the original
coordinates. Split creates a new topic from selected posts. Both are audited
and leave a redirect from the source.

### Post

```text
VISIBLE → HIDDEN (moderator; content visible to staff)
VISIBLE/HIDDEN → DELETED (tombstone: users see "post deleted")
HIDDEN/DELETED → VISIBLE (restore, no time limit)
any → PURGED (administrator only; physical removal of content, audit retained)
```

Points awarded for a post are not revoked by hiding or deletion.

## Content rating votes

- One vote per voter per post; the topic rating is the rating of post #1;
  self-votes are rejected.
- Eligibility: registered, account age ≥ 7 days, not read-only, can see the
  target, and the topic is `OPEN` (no votes in closed, archived or trashed
  topics).
- Effect: `+1` or `−1` on the post rating only. The author's reputation and
  Community Points never change because of votes.
- Moderator reversal requires a reason, keeps history and removes the vote
  from the rating.
- Votes are final: the voter cannot change or withdraw them.
- The vote ledger is owned by Forum. Reputation is untouched: its invariant
  "content votes do not implicitly mutate direct reputation" holds.
- hot/top ranking uses the topic rating (post #1).

## Sanctions core (M-0)

Extracted from Phase 14 so that Forum launches with enforceable moderation.

- Sanction kinds in M-0: verbal warning, read-only (temporary).
- Every sanction stores: subject, issuer, kind, reason (moderator comment),
  context link (post/topic), issued time, expiry.
- Verbal warning: expires after 30 days; no restriction by itself.
- Automatic escalation: 3 active warnings → read-only for 7 days; those three
  warnings are consumed. Values are administrator-configurable.
- Sanctions journal: private; visible to the user and to moderators,
  supermoderators and administrators.
- Read-only enforcement is centralized and consumed by every product module.
- Bans, appeals and Security Deck remain in Phase 14.

## Ranking and counters

- Default topic order: last activity, descending; pinned topics first.
- `new`: creation time. `top`: net score within a selected period.
- `hot`: proposed `log10(max(|score|, 1)) · sign(score) + (createdAt − epoch) / T`,
  with `T` (default 45 000 seconds) and the reply weight configurable by
  administrators. Final formula is accepted in CH-2.
- Views: unique per user (or per guest session), buffered and written in
  batches.
- Unread: per user and topic, last read post number; forum-level unread
  markers derived from it.

## Anti-abuse

- Cooldown: 60 seconds between new posts by the same user across the whole
  forum. Moderators, supermoderators and administrators are exempt; curators
  are not.
- Farming and flooding are handled by moderators through warnings and
  read-only.
- Vote eligibility rules above limit sockpuppet voting.

## Integrations

- **News:** a published article may be linked to one canonical topic. An
  unlinked article opens the topic composer with title
  `[обговорення] {newsTitle}`. News comments remain available in parallel.
  Link/unlink is audited. Moderator notification is debt until Phase 15.
- **Search:** forum is a Search source using the DEBT-052/053 viewer-safe
  mechanism; restricted categories, gated blocks, hidden, deleted and trashed
  posts never leak into hits, snippets or totals.
- **Content Gates:** `FORUM_POSTS` counts the viewer's topics created in public
  forums, excluding deleted and trashed topics.
- **Activity Feed:** new topic, reply, accepted answer and poll events,
  filtered by viewer visibility.
- **Notifications:** topic subscriptions and mentions emit versioned Outbox
  events; delivery is Phase 15.
- **Downloads:** forum attachments are not listed until Phase 16.

## Threat model

Required defenses cover:

- restricted categories leaking through lists, counters, search, Activity,
  unread markers, subscriptions and links from News;
- curator authority escaping its topic, including after topic moves;
- moderator authority escaping assigned categories;
- stale authority after scope revocation or sanction;
- vote stuffing, self-votes, duplicate votes and replay of vote events;
- duplicate point awards on retries and merge/split;
- cooldown bypass through concurrent requests;
- gated content leaking through quotes, merge/split and search snippets;
- tombstone/hidden content leaking to non-staff;
- unauthorized purge and missing purge audit;
- race conditions in merge/split, accepted answer and post numbering.

## Implementation packages

Packages are sequentially accepted; each uses a dedicated branch and PR.

### M-0 — Sanctions core

Sanctions journal, verbal warnings with expiry, temporary read-only,
automatic escalation and centralized read-only enforcement.

### P-0 — Shared Polls

Poll aggregate, anonymous/open modes, single vote without change, owner
policies; migration path for News polls.

### CH-0 — Structure and authorization

Module skeleton, categories/forums/subforums, visibility, moderator and
supermoderator scopes, permissions, schema and characterization.

### CH-1 — Topics and posts

Topic/post aggregates, forum Editor profile, revisions, quotes, staff notes,
edit windows, cooldown, close/archive/trash, tombstones, restore, purge.

### CH-2 — Votes, ranking and counters

Forum-owned content rating votes, voter dialog contract, hot/new/top/last
activity, unique views, unread tracking.

### CH-3 — Questions, polls, tags and attachments

Question topics and accepted answers, Poll integration, curated tags, Media
attachments, gated forums.

### CH-4 — Curators and moderation operations

Curator lifecycle, move/merge/split, post moves, moderator tools, M-0
integration, reports.

### CH-5 — Integrations

News discussion link, Search source, Activity events, Community Points,
`FORUM_POSTS` fact, subscription events.

### CH-6 — Minimum verification UI and phase acceptance

Accepted GraphQL contracts consumed by the frontend workstream; critical
browser flows; full gates.

## Phase acceptance matrix

| Area          | Required evidence                                                                    |
| ------------- | ------------------------------------------------------------------------------------ |
| Authorization | Guest/member/author/curator/moderator/supermoderator/admin, scopes, moves, sanctions |
| Privacy       | Restricted category, gated block, hidden/deleted/trashed leak tests in all outputs   |
| Votes         | Eligibility, uniqueness, reversal, no reputation or points side effects              |
| Concurrency   | Cooldown, numbering, merge/split, accepted answer, vote races                        |
| Moderation    | Journal, warning expiry, automatic read-only, centralized enforcement                |
| Integrations  | News link, Search, Activity, Points, Content Gates, Outbox events                    |
| Performance   | Representative topic/post corpora with recorded plans/timings                        |
| Quality       | Format, lint, typecheck, migrations, tests, builds, security and CI                  |

## Debts created by this design

- Moderator notification for News discussion links — Phase 15.
- Subscription and mention delivery — Phase 15.
- Forum attachments in Downloads — Phase 16.
- News polls migration to shared Polls — scheduled with P-0.
- Bans, appeals and Security Deck — Phase 14.

## Open questions

Questions 1–5 of the first review were resolved by the owner on 2026-11-19
(decisions F1–F5). Remaining:

1. Final mockups for topic list, topic detail and moderation tools — the owner
   will supply them later.

## Explicit non-goals for Phase 13

- tree-structured (Reddit-style) discussions;
- subscriptions to forums or tags;
- notification delivery;
- bans, appeals and Security Deck;
- author self-deletion of topics or posts;
- automatic anti-spam scoring beyond cooldown and moderator sanctions.

## Brainstorm acceptance

The brainstorm is accepted when:

- the owner confirms the decision table and resolves the open questions;
- this document and the canonical roadmap consistently describe Phase 13;
- package boundaries and owner contracts are architecture-reviewed;
- documentation checks and CI pass on the PR;
- the accepted PR is merged before any Phase 13 runtime branch is created.
