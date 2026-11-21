# Phase 13 CH-3c — Media in forum posts

Status: implementation package under review. Stacked on G2
(`phase/13-g2-forum-points`) and carries the shared Media reference commit
from PR #213 (cherry-picked; it disappears from this diff once #213 lands and
the stack is rebased). Contract: `SHARED_DOCUMENT_MEDIA_REFERENCES.md`.

## Rules implemented

| Rule                                                                      | Implementation                                                                      |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Posts may contain images and attachments (forum Editor profiles)          | media nodes accepted once `FORUM_POST_MEDIA` is wired (root composition)            |
| Only files the actor may attach: READY, own or public                     | `MEDIA_ATTACHMENT_POLICY` for files the post does not already reference             |
| A moderator editing a post keeps the author's files, adds none of others' | already-referenced IDs skip the policy; new ones are checked for the moderator      |
| References follow the document exactly                                    | `syncDocumentMediaReferences` in the post's own transaction (create/reply/edit)     |
| Hiding or deleting a post keeps its references; purge releases them       | only `purgePost` syncs an empty set; files are never deleted by Forum               |
| Moves, merges and splits keep files                                       | scope is the post id, which never changes                                           |
| Gated files never leak                                                    | `ForumPost.attachments` reads IDs from the viewer-safe (redacted) document          |
| Delivery like News                                                        | only public READY files with an active reference (`MEDIA_PUBLIC_ATTACHMENT_READER`) |
| Forum attachments in Downloads                                            | not listed until Phase 16 (owner decision 5)                                        |

Scope: `(ForumPost, postId, forum.post.media)`.

## Boundaries

- Forum owns the technical port `FORUM_POST_MEDIA`
  (`infrastructure/forum-post-media.port.ts`, published through the guarded
  `@api/modules/forum/infrastructure` entry); root composition binds it in the
  global content-read integration module
  (`composition/media-references/infrastructure/forum-post-media.adapter.ts`).
- The port is optional for Forum services: without it posts with media are
  rejected as before, which keeps unit and isolated tests unchanged.

## Verification

- `forum-media` e2e (4): own private + public files referenced, only public
  delivered, nothing listed for blocks removed from the viewer document;
  pending / foreign private / missing files rejected; moderator keeps the
  author's private file but cannot add another, removal releases only that
  reference; hide and delete keep references, purge releases them, files stay;
- all forum e2e suites with the shared Media e2e: 59/59; app boot e2e (schema
  adds `ForumPostAttachment` and `ForumPost.attachments`); API unit 1663/1663;
  lint, typecheck clean; architecture inventory 0 findings.

🖼️ A picture in a post belongs to the post — until a purge says otherwise.
