# Phase 11 — Research Lab brainstorm

Status: proposed complete design for review. This document authorizes no runtime
implementation by itself.

## Decision summary

Research Lab is the single DSS Universe Wiki and long-form research product.
`Knowledge Forge` is a historical product alias; existing technical identifiers
such as the `WIKI` Editor profile and `hasKnowledgeForgeGuardian` capability may
remain until a separately reviewed compatibility migration exists.

The 1.0 product combines collaborative Wiki pages with research articles,
guides, tutorials, case studies, notes and reports. It does not create a second
publishing module. Phase 11 delivers this product in ordered packages; the
roadmap's Phase 12 slot is reserved for later extensions of the same module.

The governing product rules are:

1. A page has one durable identity and an immutable revision history.
2. No edit or rollback overwrites a historical revision.
3. An ordinary member's revision must be reviewed before publication.
4. A Guardian may explicitly publish their own revision, but the action and
   exact revision remain fully audited.
5. Guardian is a narrow Research Lab capability. It grants no moderation,
   administration, Command Deck or audience bypass.
6. Protected-page edit authority and page-view audience are independent.
7. Shared Editor, Media, Interactions, Content Access, Search, Activity and
   Gamification foundations are reused through narrow owner contracts.
8. Realtime collaborative editing is outside 1.0. Optimistic concurrency and
   explicit conflicts are required.
9. Public hard deletion is owner-only. Normal deletion is a reversible,
   audited tombstone that preserves history.
10. The backend contract is implemented independently of frontend visual
    design. The frontend model consumes accepted GraphQL contracts and existing
    design-system components.

## Product model

### Content kinds

The first schema must support these kinds without separate tables or modules:

- Wiki page;
- manual and manual chapter;
- research entry or article;
- guide or tutorial;
- case study;
- research note;
- report.

The kind controls presentation defaults and available metadata, not ownership,
review semantics or security. Administrators may disable kinds for new content,
but existing pages remain readable according to their audience and state.

### Organization

- Categories form an acyclic hierarchy with stable IDs, unique sibling slugs,
  explicit ordering and an active flag.
- A page has one primary category and may have additional categories.
- Manuals and collections are ordered containers referencing pages; they do
  not duplicate page bodies or revision histories.
- Technologies and tags are normalized vocabularies. Tags describe subject
  matter; technologies identify tools/platforms and may carry curated metadata.
- Internal links use stable page IDs. Slugs are presentation locators, not
  foreign keys.
- A changed canonical slug creates a redirect alias. Aliases cannot shadow a
  current canonical slug and cannot form redirect chains or loops.
- Navigation is a curated tree of references to categories, collections,
  manuals or pages. Moving navigation never changes content ownership.

### Public page presentation

A published page can expose title, summary, cover, canonical document,
table of contents, reading time, tags, technologies, categories, contributors,
revision metadata, related pages and interaction counters. The viewer receives
only content and metadata authorized for that viewer.

Revision history is visible to authenticated viewers who may view the page.
It shows revision number, author, timestamp, edit summary and publication
decision. Draft document bodies, rejection reasons and security/moderation
metadata are visible only to the revision author and authorized reviewers.
The public diff compares published revisions; reviewers may compare any
revision they are authorized to inspect.

## Ownership and module boundaries

Research Lab owns:

- page identity, content kind and lifecycle;
- category/manual/collection/navigation organization;
- drafts, immutable revisions and publication pointers;
- review decisions, edit summaries, redirects and internal links;
- contributor facts and Research Lab subscriptions;
- page audience and protected-edit policy references;
- Research Lab search projection and related-page inputs;
- domain events for publication, replacement, retraction and restoration.

Existing platforms retain ownership:

| Concern                                                     | Owner                   | Research Lab integration                                           |
| ----------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------ |
| Document schema, validation, rendering and safe projections | Editor                  | Use the `WIKI` profile; store canonical JSON and owner projections |
| Hidden blocks and viewer eligibility                        | Content Access          | Evaluate before delivery, snippets, counts or derived content      |
| Files and transformations                                   | Media                   | Store only Media IDs/references; never storage URLs                |
| Comments, reactions, bookmarks, reports and annotations     | Interactions            | Register one `research-lab.page` `InteractionTarget` per page      |
| Group membership and Guardian evidence                      | IAM/Authorization       | Consume current facts through narrow capabilities                  |
| Cross-product query and pagination                          | Search root composition | Research Lab supplies authorized source hits                       |
| Activity feed                                               | Activity                | Consume canonical publication/retraction events                    |
| Points, levels and achievements                             | Their owners            | Consume qualified, idempotent publication/retraction facts         |
| Notifications                                               | Notifications           | Consume review, decision, mention and subscription events          |
| User identity/profile                                       | Auth/Users              | Store opaque subject IDs and safe profile projections only         |
| Sanctions                                                   | Moderation              | Deny/restrict actions before Premium or Guardian grants            |

Research Lab must not import repositories or application services from these
modules. Root composition joins narrow named contracts and owns cross-module
transactions where one atomic boundary is required.

## Data model

Names are conceptual and may be adjusted to repository conventions during the
schema package, but ownership and constraints are fixed.

### Core aggregate

`ResearchPage`

- stable UUID and one FK-backed `InteractionTarget`;
- kind, language, canonical slug, lifecycle state and author/creator IDs;
- current draft version for optimistic writes;
- published revision ID and publication generation;
- primary category, audience policy and protected-edit policy;
- comment/rating/indexing/featured flags;
- created, updated, first-published, last-published and tombstone timestamps;
- tombstone actor, reason and audit correlation.

The page row contains pointers and current query metadata, not the canonical
published body. The published body is always an immutable revision.

`ResearchDraft`

- one mutable working copy per page and author scope;
- Editor document, derived plain/search text and bounded metadata;
- monotonic version and base published revision ID;
- autosave timestamps and explicit conflict state;
- private until submitted.

`ResearchRevision`

- immutable page-local revision number and globally unique ID;
- author, base revision, Editor document and derived projections;
- title, summary, slug proposal, kind-specific metadata and Media references;
- edit summary, creation timestamp and content hash;
- submission identity and optional superseded-by link.

`ResearchReviewDecision`

- revision ID, actor, action, reason and timestamp;
- actions: submitted, changes requested, rejected, approved, published,
  withdrawn, rolled back and restored;
- audit/request correlation and policy snapshot identity;
- append-only; decisions are never edited or deleted.

### Organization and links

Separate owner tables provide category hierarchy, page-category membership,
tags, technologies, manuals, ordered chapters, collections, navigation entries,
slug aliases and typed internal links. Database constraints and transaction
checks reject self-links where invalid, duplicate positions, hierarchy cycles,
slug collisions and redirect loops.

### Contributors and subscriptions

Contributor projections are rebuilt from accepted/published revision facts.
They are not an authorization source. A page author cannot remove another
contributor's historical attribution.

Subscriptions may target a page, category, manual, collection, technology or
author. They drive notifications only; they do not change page visibility.

## Lifecycle and state machine

### Page states

`DRAFT`, `ACTIVE`, `ARCHIVED`, `TOMBSTONED`.

- `DRAFT`: no published revision; visible only to authorized contributors and
  reviewers.
- `ACTIVE`: has a published revision and may be delivered to its audience.
- `ARCHIVED`: published history remains addressable, but the page is excluded
  from normal navigation, recommendations and new edits unless restored.
- `TOMBSTONED`: ordinary viewers receive a stable removal surface; owner sees
  the content inline with a deleted marker and complete audit facts.

### Revision states

`DRAFT`, `IN_REVIEW`, `CHANGES_REQUESTED`, `REJECTED`, `PUBLISHED`,
`SUPERSEDED`, `WITHDRAWN`.

Transitions:

1. Save creates or updates a private draft with `expectedVersion`.
2. Submit freezes a new immutable revision and moves it to `IN_REVIEW`.
3. An ordinary author cannot publish their revision.
4. A Guardian may request changes, reject or publish a submitted revision.
5. A Guardian's own edit still creates a revision. The explicit publish command
   may atomically submit and publish it, recording both actions.
6. Publishing advances the page pointer and generation; the formerly published
   revision becomes `SUPERSEDED` but remains immutable and readable in history.
7. Withdrawing affects only an unpublished submitted revision.
8. Rollback creates and publishes a new revision whose content is copied from
   the selected historical revision and whose provenance records the rollback.
9. A rejected revision is never mutated into an accepted revision. A new draft
   may use it as its starting point.

All transitions validate current Guardian evidence, sanctions, page policy,
expected page generation and revision state inside the command boundary.

## Concurrency and transactions

- Draft saves use compare-and-swap on the monotonic draft version.
- Submission verifies the base published revision and draft version; a conflict
  returns both current identities without silently merging documents.
- Publish/reject/withdraw/rollback lock the page and selected revision, then
  re-read authorization and state.
- Only one command may advance a page publication generation.
- Slug changes, alias creation, publication pointer, Media reference changes,
  InteractionTarget status, Audit and Outbox are committed atomically where
  their invariants require one boundary.
- Side effects are idempotent by canonical event ID and publication generation.
- No distributed lock, last-write-wins merge or realtime co-editing is part of
  1.0.

## Authorization and protected pages

Viewing and editing are evaluated independently.

### Audience

Page audience uses the established audience vocabulary: public, authenticated
members and explicit `group:<key>` grants, with Content Access policies for
block-level gates. Premium may bypass configured numeric thresholds only after
the surrounding page audience already admits it. Guardian does not imply
Premium and never bypasses audience restrictions.

Search results, related pages, internal-link previews, comments, counters,
SEO and Activity must use the same server-side page eligibility. Unauthorized
metadata must not leak through totals, facets, snippets, slugs or titles.

### Edit protection

Protection levels are explicit page policy, not inferred from audience:

- `OPEN`: authenticated members may propose revisions;
- `TRUSTED`: configured access groups may propose revisions;
- `GUARDIAN_ONLY`: only Guardians may create or publish revisions;
- `LOCKED`: no content edits until an authorized Guardian unlocks it.

Guardians may review, publish, reject, rollback, protect and unprotect Research
Lab pages. They do not gain site moderation, user sanctions, group management,
Command Deck or hard-delete authority. Owner and administrators retain their
separately defined platform authority; no moderator role is inferred here.

Every authorization denial is fail-closed on unavailable IAM, sanctions,
audience or policy evidence. Expiry and revocation take effect on the next
command/read; no cross-request authorization cache is introduced.

## Editor and delivery

- Every draft and revision uses the canonical Editor `WIKI` profile.
- The API validates document version, structure, depth, node/mark allowlists,
  Media references and Content Gate references before persistence.
- Canonical JSON is stored; HTML, plain text, search text, table of contents and
  reading time are derived and versioned projections.
- Preview is authenticated and viewer-safe. Published delivery re-evaluates
  Content Gates and never trusts frontend hiding.
- A stale or missing projection fails closed and is repairable by an idempotent
  owner job tied to source revision and projection versions.
- AI suggestions, if later exposed, remain labeled suggestions requiring a
  human Apply action and do not publish automatically.

## Media lifecycle

- Covers, inline media and attachments are READY Media owned by or explicitly
  accessible to the actor at submission time.
- Draft references do not make files public.
- Submission records the exact Media IDs; publication atomically activates the
  published reference set for that revision.
- Superseding or retracting a revision removes only its active reference claims.
  Media cleanup remains Media-owned and may delete a file only when no live
  owner reference exists.
- Download authorization follows page audience and Content Gate policy. Public
  storage URLs are never persisted in Research Lab.
- The same contracts work for LOCAL and the accepted universal S3-compatible
  adapter; MinIO remains a compatibility target, not the production default.

## Shared interactions and moderation

Each page registers exactly one `research-lab.page` InteractionTarget. The page
owner policy authorizes comments, reactions, bookmarks, reports, views and
shares from current page state, audience, feature flags and sanctions.

- Comments use the shared threaded comment/revision/tombstone platform.
- Reactions and bookmarks use shared ledgers; Research Lab stores no duplicate
  tables.
- Disabling comments locks new writes without deleting history.
- Archiving or tombstoning retires/locks interactions according to the action,
  while preserving immutable histories and audit.
- Moderator removal is a soft tombstone with actor, timestamp, reason, target,
  request/session correlation and bounded security facts. IP/user-agent facts
  belong in protected audit records, not public GraphQL models.
- Only owner-authorized hard purge may physically remove public content, and it
  requires an explicit retention/legal check plus a separate audit event.

## Search, related content and SEO

Research Lab implements a named authorized source for the accepted shared
Search root. It returns stable page/revision identity, title, language, slug,
viewer-safe excerpt, publication time, kind and safe facets.

- PostgreSQL remains the first engine. Measure corpus size, gated share, short
  terms, Cyrillic, cross-block matches, page depth and query plans.
- Counts, facets, snippets and pagination come from one authorized match set in
  one database snapshot.
- Publication, audience/protection changes, rollback, archive and tombstone
  update the source projection idempotently.
- Elasticsearch is considered only after measured latency/relevance thresholds
  justify its operational cost. It cannot become an authorization source;
  results still require current owner eligibility before counts or delivery.
- Related pages use visible published pages only and deterministic signals:
  shared tags/technologies/categories/internal links, with stable tie-breaking.

Only public, active, indexing-enabled pages produce canonical metadata,
sitemaps and structured SEO output. Member/group/gated-only pages are excluded
from public indexing. Redirect aliases emit one canonical destination.

## Activity, notifications and gamification

Canonical Outbox facts are emitted for revision submitted, changes requested,
rejected, published, superseded, rolled back, archived, restored and
tombstoned. Private review events never enter a public feed.

- Activity shows only current viewer-authorized publication events and supports
  retraction when visibility or lifecycle changes.
- Notifications cover author/reviewer decisions, mentions and subscriptions;
  payloads contain stable IDs and are resolved through current authorization.
- Community Points/Achievements consume only qualified canonical publication
  events. Autosaves, submissions, rejected revisions and rollbacks do not earn
  duplicate rewards.
- A publication cycle has a stable source identity. Retraction reverses its
  qualified effects; a genuinely new accepted cycle may qualify under current
  rules.
- Contributor lists and leaderboards are projections, never publication or
  authorization evidence.

## API contract

GraphQL is the primary product surface. Commands use typed input objects and
return the resulting page/revision identity plus versions needed by the client.

Queries:

- page by canonical route or stable ID, with viewer-safe published projection;
- category/navigation/manual/collection trees;
- paginated browse and contributor lists;
- public revision history and authorized review history;
- revision diff with explicit from/to IDs;
- current actor's drafts and review queue;
- related pages and Research Lab facets through Search.

Commands:

- create page/draft, save draft, discard draft and submit revision;
- request changes, reject, withdraw and publish;
- rollback, archive, restore, tombstone and owner hard-purge request;
- protect/unprotect, change audience and manage organization;
- subscribe/unsubscribe.

Every mutation takes the applicable `expectedVersion` or
`expectedPublicationGeneration`. Conflicts are typed domain outcomes, not 500
errors. Successful responses preserve generated-client compatibility inside a
package; breaking schema changes require coordinated API/frontend acceptance.

REST is limited to justified operational or file-transfer surfaces. It must not
become a second Research Lab command API.

## Threat model

Required defenses cover:

- horizontal access to drafts/review decisions/protected pages;
- Guardian capability expiry/revocation and self-publish audit;
- stale-authority checks during publication;
- lost updates, double publication and rollback races;
- slug/redirect/category cycles and duplicate canonical routes;
- hidden-text leaks through search, related content, comments, counters, SEO,
  Activity, notifications and Media downloads;
- malformed or oversized Editor documents and projection drift;
- attachment substitution or cleanup races;
- event replay, duplicate rewards and stale feed entries;
- soft-delete bypass and unauthorized hard purge;
- enumeration through totals, errors and timing-sensitive batch paths.

The deferred hostile local OS-writer research remains retained but does not
block Phase 11 under the accepted deployment model: only the owner and DSS
processes control the filesystem; users interact through site/API.

## Implementation packages

Packages are sequentially accepted; each uses a dedicated branch and PR.

### RL-0 — Contract and schema foundation

- Research Lab module skeleton and owner-local domain types;
- additive core/category/tag/technology/manual/collection/link schema;
- page/revision/review state machines and constraints;
- narrow Auth/Users/IAM/Authorization contracts;
- migration, architecture and lifecycle characterization.

Acceptance: zero schema drift; immutable revision and cycle/slug constraints;
ordinary/Guardian/expired/revoked/sanctioned matrices.

### RL-1 — Draft, revision and review workflow

- WIKI Editor validation and private autosave;
- create/save/submit/change-request/reject/withdraw;
- Guardian publish, including explicit self-publish;
- optimistic conflict and concurrent decision tests.

Acceptance: no lost update, no history overwrite, deterministic typed conflicts,
and no unauthorized draft/review disclosure.

### RL-2 — Publication, rollback and delivery

- atomic publication pointer/generation, redirects and immutable rollback;
- viewer-safe page, history and diff queries;
- archive/restore/tombstone and owner inline deleted marker;
- Audit/Outbox and projection repair.

Acceptance: concurrent publish/rollback tests, historical integrity, deletion
audit and stale/missing projection fail-closed behavior.

### RL-3 — Media and organization

- covers, inline Media and attachments;
- categories, manuals, collections, navigation and internal links;
- tags/technologies and contributor projections.

Acceptance: READY/reference authorization, LOCAL/S3 parity, cleanup races,
cycle prevention and stable links across slug moves.

### RL-4 — Shared interactions and moderation

- canonical InteractionTarget and owner policy;
- comments, reactions, bookmarks, reports, views and shares;
- sanctions, locks and soft-delete lifecycle.

Acceptance: guest/member/group/Guardian/owner matrices; exact totals and
pagination; no hidden metadata or child-target bypass.

### RL-5 — Search, SEO and discovery

- authorized Research Lab source in shared Search;
- related pages, browse facets, canonical SEO and redirects;
- performance corpus and PostgreSQL query-plan evidence.

Acceptance: viewer-safe counts/snippets/facets, revocation/expiry, concurrent
publication snapshot, Unicode/pattern input, deep-page and stale-index tests.

### RL-6 — Activity, notifications and gamification

- canonical publication/retraction facts;
- Activity and subscription notifications;
- qualified Points/Levels/Achievements integration.

Acceptance: replay/idempotency, rollback/retraction, no reward for drafts or
rejections, viewer-safe feed and late-consumer recovery.

### RL-7 — Minimum verification UI and phase acceptance

- existing-component pages for browse, read, edit, history/diff and review;
- generated GraphQL client integration coordinated with the frontend model;
- accessibility, responsive behavior and critical-flow browser tests;
- operations/runbook, repair jobs and final documentation.

This is a verification UI, not permission to redesign the frontend or modify
the other model's active branch. Visual work is integrated through reviewed API
contracts and a dedicated frontend branch.

Acceptance: ordinary author-to-review-to-publication, Guardian self-publish,
rollback, protected page, Media, interactions and search work end to end; full
quality gate and CI are green.

## Phase acceptance matrix

| Area          | Required evidence                                                                   |
| ------------- | ----------------------------------------------------------------------------------- |
| History       | Every accepted edit and rollback leaves immutable provenance                        |
| Authorization | Guest/member/group/Guardian/admin/owner plus expiry, revocation and sanctions       |
| Concurrency   | Draft CAS, double submit, publish/reject, publish/rollback and slug races           |
| Privacy       | Draft, audience, gated block and deleted-content leak tests across every projection |
| Media         | READY ownership, reference activation, LOCAL/S3 parity and cleanup races            |
| Interactions  | Owner policy, child comments, totals, pagination and tombstones                     |
| Search/SEO    | Authorized counts/snippets/facets, aliases, sitemap and stale projection recovery   |
| Events        | Outbox atomicity, replay, retraction and idempotent consumer effects                |
| Performance   | Representative browse/search/history/diff corpora with recorded plans/timings       |
| Operations    | Migration/rollback rehearsal, projection repair, queue recovery and audit lookup    |
| API/frontend  | Generated schema/client parity and accepted critical browser flows                  |
| Quality       | Format, lint, typecheck, migrations, tests, builds, security and CI                 |

## Explicit non-goals for Phase 11

- realtime multi-user collaborative editing;
- a second Wiki or separate Research publishing module;
- Elasticsearch without measured PostgreSQL failure thresholds;
- anonymous editing;
- Guardian-as-moderator/admin or Guardian audience bypass;
- arbitrary executable embeds or storage URLs in documents;
- historical reward backfill without a separately accepted package;
- hostile local OS-writer containment under the current deployment model;
- broad File Passport cleanup unrelated to files otherwise changed.

## Decisions that may be tuned without redesign

The administrator may later configure page sizes, featured limits, review queue
ordering, allowed content kinds, category navigation, indexing flags and
notification preferences. These settings must not alter ownership, immutable
history, authorization precedence or audit guarantees.

## Brainstorm acceptance

The brainstorm is accepted when:

- this document and canonical roadmap consistently describe one Research Lab;
- every Phase 11 and reserved Phase 12 feature is allocated or explicitly
  deferred;
- package boundaries and owner contracts are architecture-reviewed;
- threat, lifecycle, concurrency and acceptance matrices are complete;
- documentation checks and CI pass on the PR;
- the accepted PR is merged before any Phase 11 runtime branch is created.

🧪 A rollback is a new fact about history, not a time machine with write access.
