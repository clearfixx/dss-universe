# Phase 13 CH-1b — Moderation lifecycle

Status: implementation package under review. Stacked on CH-1a
(`phase/13-ch1a-topics-posts`); not an accepted baseline.

## Scope

CH-1b completes the CH-1 lifecycle from the brainstorm:

- post moderation: hide, delete (tombstone) and restore replies;
- topic moving: archive, unarchive, trash and restore;
- pinning;
- staff notes on posts with the author's staff role;
- administrator purge of post content and its revisions;
- staff-aware delivery of tombstones and moderation facts.

Deferred to CH-4: curator assignment, moving topics between forums, merge,
split and moving posts to another topic. The curator slot added in CH-1a is
already honoured, so curator rules work as soon as CH-4 assigns curators.

## Owner rules implemented

| Rule                                                                      | Implementation                                       |
| ------------------------------------------------------------------------- | ---------------------------------------------------- |
| Authors never delete their own topics or posts                            | only moderators/curators may hide or delete          |
| Curators act on replies of their own topic only                           | `canModeratePost` with `curator` scope               |
| Deleted posts show "post deleted" to users; staff see content, actor, why | `postView` returns content/moderation to staff only  |
| Restoration has no time limit                                             | `restorePost` from `HIDDEN`/`DELETED`                |
| Archive: closed but visible                                               | `ARCHIVED` state, `scope: ARCHIVED` listing          |
| Trash: hidden from users, visible and restorable by moderators            | `TRASHED` + `stateBeforeTrash`, moderator-only reads |
| Full purge impossible for users and moderators; administrators may purge  | `forum.content.purge`, reason required, audited      |
| Public mark of staff intervention                                         | staff notes with `CURATOR`/`MODERATOR`/… role        |

The first post is never hidden or deleted on its own; staff trash the topic
instead, so a topic never loses its body while staying listed.

## Post states

```text
VISIBLE → HIDDEN | DELETED
HIDDEN  → DELETED | VISIBLE
DELETED → VISIBLE
any     → PURGED   (administrator, terminal)
```

Database rules: moderation actor/time/reason exist exactly for `HIDDEN` and
`DELETED`; purge actor/time/reason exist exactly for `PURGED`; a purged post
keeps no text and can never change again.

## Purge

Purge sets the post to `PURGED`, empties its document and text, and erases the
document and text of every revision. Revisions are otherwise immutable: the
database trigger accepts that one erasing update only inside a transaction that
declares `dss.forum_purge`. Audit keeps who purged, when and why.

## Visibility of moderation data

| Viewer                                | `HIDDEN`/`DELETED` content | Moderation facts | Staff notes |
| ------------------------------------- | -------------------------- | ---------------- | ----------- |
| Guest / member                        | no (state only)            | no               | yes         |
| Topic curator, category moderator, up | yes                        | yes              | yes         |
| Anyone, `PURGED`                      | no                         | —                | yes         |

## Permissions

`forum.content.purge` is new and seeded for admin and owner. All other actions
use CH-0 scope: category moderator assignment, `forum.moderate.all` or the
topic curator.

## Verification

- Prisma format/validate and zero schema drift;
- moderation rule unit tests;
- migrated-database e2e: tombstone visibility for public versus staff,
  restoration, curator scope and first-post protection, staff notes,
  archive/trash/restore with moderator-only trash, pinning order, purge of post
  and revisions, purge terminality and revision immutability outside purge.

🧹 Moderation should leave a trail, never a hole.
