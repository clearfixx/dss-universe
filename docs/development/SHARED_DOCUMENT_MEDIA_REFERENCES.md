# Shared document Media references

Status: contract proposed for review (Forum CH-3c and Research Lab RL-3).
Agreed with Codex in `coordination/codex-claude` / `AGENT-CHAT.md`.

## Pieces

| Piece                                                         | Owner            | Role                                                                    |
| ------------------------------------------------------------- | ---------------- | ----------------------------------------------------------------------- |
| `collectEditorMediaIds(document, nodeTypes?)` (`@dss/editor`) | Editor           | pure, unique, ordered IDs from a **validated** document, gates included |
| `MEDIA_ATTACHMENT_POLICY.evaluate(actorId, mediaIds)`         | Media            | may the **acting user** attach: exists, READY, own or public            |
| `syncDocumentMediaReferences(tx, scope, actorId, mediaIds)`   | root composition | active references of one scope = exactly the given set                  |

## Rules

- A scope is `(targetType, targetId, purpose)`. Nothing outside it changes, so
  the same file stays referenced by other revisions, purposes or modules.
- An empty set removes all active references of the scope; repeating a set is
  a no-op; a removed reference is restored, never duplicated.
- The owner decides **when** and **with which set** to sync (draft save,
  submission, publication, revision replacement or revocation, purge). Hiding
  or tombstoning content is not physical deletion; purge is owner-only.
  Removing a reference never deletes a file — physical cleanup stays in Media.
- Authorship of the edited content never grants access to another user's
  private file; attach permission is evaluated for the real actor.
- Download visibility (audience, Content Gate) is decided at read time,
  separately from attachment.

## News

News moves onto the shared extraction and sync without behaviour change: it
claims `attachment` nodes only (Content Gate payloads included) under purpose
`news.attachment`. Its existing attach check (own or public, through
`MEDIA_PUBLICATION_EVIDENCE`) is unchanged here; switching News to
`MEDIA_ATTACHMENT_POLICY` would add the READY requirement and is a separate,
explicit decision.

## Consumers next

- Forum CH-3c: `ForumPost` scope, purpose `forum.post.media`; hidden or deleted
  posts keep references, purge clears them.
- Research Lab RL-3 (Codex): exact set fixed per revision on submission,
  activated on publication; replacement or revocation clears only that
  revision's claims.

🖇️ One file, many owners, one exact set per scope.
