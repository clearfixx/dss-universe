# Phase 13 CH-1a — Topics and posts

Status: implementation package under review. Stacked on CH-0
(`phase/13-ch0-forum-structure`); not an accepted baseline.

The brainstorm's CH-1 is delivered in two packages to keep reviews bounded:

- **CH-1a (this package):** topics, numbered posts, revisions, edit windows,
  close/reopen, posting cooldown and owner interaction policy;
- **CH-1b:** archive/trash, hide/delete/restore, tombstone delivery, purge,
  staff notes and pinning.

## Scope

- `forum_topics` (kind `DISCUSSION`/`QUESTION`, state, pin flag, curator slot,
  counters) with one `forum.topic` Interaction Target each;
- `forum_posts` numbered per topic (`#N`, gap-free under concurrency through a
  topic row lock), canonical Editor JSON (`FORUM_TOPIC` for post #1,
  `FORUM_REPLY` for replies), structured `replyToNumber` and `quotedNumbers`
  referencing earlier posts only;
- `forum_post_revisions`: immutable history; every edit is compare-and-swap on
  the post revision;
- `forum_posting_cooldowns`: one atomic conditional upsert enforces the global
  60-second cooldown;
- topics and posts can never be physically deleted (database triggers);
- `forum.topic` owner policy registered in root composition.

## Owner rules implemented

| Rule                                                                       | Where                            |
| -------------------------------------------------------------------------- | -------------------------------- |
| Topic author edits the first post only until a curator is assigned         | `canEditPost`                    |
| Reply author edits a reply for 10 minutes                                  | `canEditPost`                    |
| Curator, category moderator, supermoderator, administrator edit afterwards | `canEditPost` (`moderator`)      |
| Author may close but never reopen a topic                                  | `canCloseTopic`/`canReopenTopic` |
| 60-second cooldown across the whole forum; moderators and above exempt     | `cooldown`, `cooldownExempt`     |
| Replies only in open topics                                                | `reply`                          |
| Default list order: pinned first, then last activity; `NEW` switch         | `topics`                         |

"Moderator" means a moderator assigned to the topic's category or a holder of
`forum.moderate.all` (seeded for administrators and the owner). Structure
managers are additionally exempt from the cooldown. Curator assignment itself
arrives in CH-4; the `curatorId` slot and its rules are already enforced.

## Interaction policy (`forum.topic`)

- `READ`, `SHARE`: category visibility (guests included where public);
  trashed topics are invisible.
- `BOOKMARK`: any authenticated viewer who can read.
- `REACT` (reputation votes in CH-2, poll ballots from P-0): authenticated and
  topic `OPEN`; closed, archived and trashed topics deny voting.
- `COMMENT`: always denied — forum replies are posts.

Read-only subjects are blocked from every write by the M-0 interceptor.

## Deliberately rejected until CH-3

Documents containing `contentGate`, `mediaReference` or `attachment` nodes are
rejected. Forum has no Media ownership checks or server-side gate redaction
yet; accepting them now would risk leaking hidden content.

## Verification

- Prisma format/validate and zero schema drift;
- topic rule unit tests (edit windows, curator handover, close/reopen,
  references, titles);
- migrated-database e2e: creation evidence, gap-free numbering under
  concurrency, cooldown and moderator exemption, edit windows and CAS,
  revision immutability, lifecycle authority, restricted visibility and owner
  policy, deferred node rejection, undeletable rows.

💬 Every reply gets a number; every number keeps its place.
