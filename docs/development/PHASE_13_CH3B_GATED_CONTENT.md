# Phase 13 CH-3b — Hidden content (Content Gates) in forum posts

Status: implementation package under review. Stacked on CH-3a
(`phase/13-ch3a-questions-polls-tags`); not an accepted baseline.

## Owner rule

Content Gates in posts are allowed **only in forums explicitly flagged for
gated content** (`forums.allowsGatedContent`, set by structure managers in
CH-0).

## Scope

- `contentGate` nodes are accepted in topics and replies of flagged forums and
  rejected everywhere else;
- the author (and any later editor) must be able to read every hidden block in
  the document they save — Editor's `EDITOR_DELIVERY_READER` decides;
- editing requires access to the **stored** document too, so a moderator who
  cannot read a hidden block cannot overwrite it by accident;
- delivery redacts hidden blocks per viewer on the server through Editor's
  `EDITOR_VIEWER_DOCUMENT_PROJECTOR` (guests included); Forum never decides gate
  outcomes itself;
- read-only viewers see no hidden content (M-0 rule enforced by Content
  Access);
- media and attachment nodes remain rejected (see below).

## Not in this package

- **Media in posts (CH-3c).** Media needs `media_references` written in the
  owner's transaction so retention never purges referenced binaries. News already
  does this in root composition; Research Lab needs the same. A shared approach
  was proposed to Codex in `coordination/codex-claude`; Forum keeps rejecting
  media until it is agreed.
- **Search snippets and Activity** for gated posts — CH-5 reuses the
  DEBT-052/053 viewer-safe projection.
- Quotes copy no content: they reference post numbers, and quoted posts are
  delivered through the same redaction.

## Verification

- forum e2e (gated content, topics, moderation, ratings, curation): 28/28,
  including: rejection outside flagged forums, author access requirement,
  per-viewer redaction for guests/members/unlocked viewers, protected editing
  of stored hidden blocks, continued media rejection;
- lint and typecheck clean.

🔐 A lock with no server-side key is decorative. This one is not.
