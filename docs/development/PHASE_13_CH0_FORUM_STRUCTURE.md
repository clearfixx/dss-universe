# Phase 13 CH-0 — Forum structure and authorization

Status: implementation package under review. Stacked on P-0
(`phase/13-p0-shared-polls`); not an accepted baseline.

## Scope

CH-0 establishes the Community Hub owner boundary (`forum` module) and its
structure. It creates no topics or posts.

Included:

- `forum_categories` with `PUBLIC`, `MEMBERS` or `RESTRICTED` visibility;
- `forum_category_audience`: allowed `role:<name>` and `group:<key>` entries
  for restricted categories (owner decision F5: both kinds);
- `forums` with exactly one optional level of subforums inside the parent's
  category, backstopped by a database trigger;
- `forum_moderator_assignments`: one moderator may hold several categories;
  revocation keeps history; one active assignment per category and moderator;
- permissions `forum.structure.manage`, `forum.moderators.assign`,
  `forum.moderate.all` (supermoderator scope), seeded for admin and owner;
- GraphQL: `forumCategories`, `forumCategoryModerators`,
  `createForumCategory`, `updateForumCategory`, `createForum`, `updateForum`,
  `assignForumCategoryModerator`, `revokeForumCategoryModerator`;
- `canModerateCategory` scope decision for later packages.

Deferred:

- topics, posts, staff notes, archive/trash destinations — CH-1;
- curated tags and gated-forum delivery — CH-3 (`allowsGatedContent` is stored
  now);
- curators and moderation operations — CH-4.

## Visibility rules

| Visibility   | Who sees the category and everything inside it                 |
| ------------ | -------------------------------------------------------------- |
| `PUBLIC`     | everyone, including guests                                     |
| `MEMBERS`    | authenticated, eligible members                                |
| `RESTRICTED` | members holding at least one listed `role:` or `group:` key    |
| any          | structure managers (`forum.structure.manage`), unconditionally |

- Visibility is inherited by every forum and subforum of the category.
- Hidden categories are indistinguishable from missing ones (`NOT_FOUND`).
- Audience entries are returned only to structure managers.
- Inactive categories and forums are hidden from everyone but structure
  managers.
- Supermoderators follow the same visibility rules; administrators add them
  to a restricted audience when they must moderate there.

## Authority

Viewer facts come from Authorization's current audience (`role:` and `group:`
keys) and permissions on every request, never from role names. Moderator scope
is `forum.moderate.all` or an active category assignment.

## Verification

- Prisma format/validate and zero schema drift;
- structure and visibility rule unit tests;
- migrated-database e2e: hierarchy and nesting limits (service and trigger),
  restricted/member visibility, administrator override, moderator assignments
  across categories with revocation, supermoderator scope, permissions and
  duplicate slugs.

Recorded local results (2026-11-20, Node 24.22.3, disposable `dss_test`):

- migration applied to `dss_test`; zero Prisma schema drift;
- API unit suite: 1635 passed, 106 skipped by the existing opt-in policy;
- forum structure e2e 7/7;
- full API e2e: 985/986. The one failure was a 5-second timeout in the
  unrelated `achievements-foundation` suite while other local test runs
  loaded the machine; rerun alone it passed 1/1. It is recorded, not waived;
- architecture inventory: 0 findings; lint and typecheck clean; generated
  Web GraphQL client unchanged.

GitHub CI on the committed PR head remains the acceptance gate.

🧭 Structure first: every later conversation needs a room to happen in.
