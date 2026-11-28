# Static pages builder

Status: all three packages implemented 2026-11-28: API, Command Deck and the
public page with its files and sitemap entries. First part of
the Phase 20 CMS Builder.

## Owner decisions (2026-11-28)

- One mechanism creates static pages (rules, contacts and the like) without
  code changes. No hand-coded public rules page before it.
- Administrators and the owner create and publish pages. For static pages this
  replaces the earlier "only owner accesses CMS Builder" rule.
- Version 1 content is one DSS Editor document, not a block constructor.
- Public address: `/pages/<slug>`.
- Menu and footer links managed from Command Deck come in a later package.

## Version 1

- Command Deck list of pages: title, address, state, last change.
- Create and edit: title, address, short description (search and link
  previews), document in the DSS Editor `ADMIN` profile.
- States: draft and published. Saving edits a working copy; the public page
  changes only on publish. Unpublishing returns the page to draft.
- Preview of the working copy before publishing.
- Public page for guests and members; an unpublished page is a 404.
- Optimistic revision check, so two administrators cannot silently overwrite
  each other.
- Every create, save, publish and unpublish is audited. Permission
  `cms.pages.manage` (admin, owner).
- Published pages appear in the sitemap.

## Not in version 1

Block constructor, menus and footer, scheduled publication, review workflow,
version history with rollback, redirects after an address change, homepage
sections.

## Technical points to settle in implementation

- A new `pages` API module owns pages; the document is validated by the Editor
  module like News and Wiki documents.
- Images inside a public page must be readable by guests while uploads are
  private by default. The delivery path used by published News is the reference;
  a page image becomes public only through a published page.
- Slugs: lowercase Latin letters, digits and hyphens; unique.

## Packages

1. API: pages, validation, publish and unpublish, permission, audit.
2. Web: Command Deck list, editor, preview.
3. Web: public `/pages/<slug>`, images, sitemap.
