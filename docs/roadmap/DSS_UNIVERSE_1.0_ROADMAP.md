# DSS Universe 1.0 — Canonical Product and Delivery Roadmap

> Status: Approved working roadmap
>
> Version: 2.1
>
> Updated: 2026-07-18
>
> Target: DSS Universe 1.0

---

## 1. Purpose

This document is the canonical working roadmap for DSS Universe 1.0.

It combines:

- the original DSS Universe 1.0 Product Roadmap;
- the System Design draft;
- the frozen DSS Media Platform v1 specification;
- approved UI mockups;
- the actual repository state;
- product and architecture decisions approved during the July 2026 reconciliation.

Older files under `docs/roadmap/` remain historical references until they are explicitly retired. When they conflict with this document, this roadmap is authoritative for the 1.0 delivery sequence.

---

## 2. Product Goal

DSS Universe 1.0 is a modular developer platform, not a collection of unrelated CRUD applications.

> Build. Share. Learn. Grow. Together.

The platform allows users to:

- create a professional and social profile;
- follow people and community activity;
- publish and discuss news;
- collaborate in Knowledge Forge;
- publish research and technical material;
- participate in structured forum discussions;
- learn and publish courses;
- share structured downloadable resources;
- communicate privately;
- receive notifications and mentions;
- build reputation, Community Points, levels and titles;
- receive support and follow feature/release progress;
- use AI assistance throughout the product.

Administrators operate the platform through Mission Control, Security Deck, CMS Builder, Media Library and Maintenance Center.

---

## 3. Canonical Product Map

### Public and authenticated surfaces

- Universe Landing — guest presentation and acquisition;
- Universe Feed — authenticated summary of activity since the last visit;
- Command Deck — personal progress, work and recommendations;
- Astronaut Profile — public social profile;
- Account Settings — private account and privacy management;
- Members Directory — searchable community and leaderboards.

### Feature modules

- News;
- Knowledge Forge;
- Research Lab;
- Community Hub / Forum;
- Academy;
- Downloads;
- Communications;
- Support Center;
- Releases / Changelog;
- Gamification.

### Platform capabilities

- Authentication;
- IAM and Authorization;
- Access Groups;
- Media;
- Events and Jobs;
- Audit;
- Notifications;
- Email;
- Search;
- Activity Feed;
- Comments;
- Reactions and Voting;
- Reputation and Community Points;
- Content Gates;
- Moderation, Sanctions and Appeals;
- Security Intelligence;
- Presence;
- Analytics;
- AI Core;
- Themes;
- Editor;
- SEO;
- Feature Flags and Maintenance.

### Administrative surfaces

- Mission Control — general platform administration;
- Security Deck — identity, sessions, sanctions and security intelligence;
- CMS Builder — pages, navigation, public content and branding;
- Media Library — media operations;
- Maintenance Center — health, queues, cache, storage and maintenance;
- Analytics Builder — approved metrics and reports.

---

## 4. Approved Technology Direction

### Applications and API

- NestJS modular monolith;
- Next.js App Router;
- GraphQL and Apollo for product queries/mutations;
- REST/OpenAPI for media transfer, health, webhooks and operations;
- GraphQL Code Generator and DataLoader;
- controllers and resolvers share application services.

### Data and background processing

- PostgreSQL and Prisma;
- Redis;
- BullMQ;
- dedicated worker application;
- transactional outbox;
- idempotent consumers;
- PostgreSQL full-text search before a dedicated search engine.

### Frontend foundation

- Apollo Client — GraphQL server state;
- TanStack Query — REST/file/operational state;
- TanStack Table and Virtual;
- Zustand — client application state;
- Tailwind, shadcn/ui and Radix;
- Theme Engine;
- Tiptap-based DSS Editor;
- Shiki syntax highlighting;
- Lucide, Simple Icons and custom DSS icons.

### Operations

- S3-compatible Media storage, with MinIO in realistic local/staging environments;
- Pino structured logging;
- OpenTelemetry traces and metrics;
- CI, tests, security gates, backups and recovery.

---

## 5. Delivery Principles

1. A phase is complete only when implemented, tested, documented and integrated.
2. Foundation work is delivered before dependent product modules.
3. Architecture is not frozen until product behavior is approved.
4. Secondary effects use events/jobs and must not block primary transactions.
5. New modules use GraphQL from the start; REST remains for appropriate transport cases.
6. Security, audit, permissions and deletion policies are implemented with each feature, not at the end.
7. Every large module is delivered as a working vertical slice before breadth is added.
8. `Implemented`, `WIP`, `approved` and `planned` are distinct statuses.

---

# Phase 1 — Product and Architecture Reconciliation

## Status

```text
COMPLETE
```

## Goal

Create one consistent source of truth before further Media or product implementation.

## Deliverables

- canonical 1.0 roadmap;
- compact Project Context;
- corrected product/module map;
- corrected Command Deck vs Mission Control terminology;
- approved technology stack;
- GraphQL/Apollo decision;
- frontend state and editor decisions;
- approved mockup catalog with canonical/alternative status;
- revised System Design;
- explicit v1.0 vs v1.1+ boundary;
- ADRs for GraphQL, events/outbox, editor, themes and deletion lifecycle.

## Definition of Done

- roadmap and system design no longer contradict each other;
- canonical mockups are named and mapped to routes/modules;
- every platform capability has a clear owner;
- implementation sequence is approved;
- WIP Media code has not been migrated before model reconciliation.

---

# Phase 2 — Engineering, Toolchain and Quality Foundation

## Status

```text
COMPLETED — 2026-07-18
```

## Delivered

- Node.js 24.18.0 and pnpm 11.9.0 are pinned;
- root commands and workspace filters are normalized;
- shared TypeScript and ESLint packages contain reusable configurations;
- GitHub Actions validates architecture, Prisma, lint, types, tests, coverage and builds;
- API e2e tests use a dedicated ephemeral PostgreSQL service;
- Vitest, Testing Library and Playwright establish the Web test foundation;
- Auth, IAM and Users have baseline unit tests with enforced critical-file coverage;
- Web builds use deterministic local system fonts;
- frozen-lockfile installation is verified;
- dependency audit and Dependabot are enabled;
- canonical engineering commands, onboarding and quality-gate documentation are current.

## Definition of Done

- clean checkout installs and builds deterministically;
- every PR runs CI;
- failing schema, types, tests or build blocks merge;
- baseline tests exist for Auth, IAM and Users;
- onboarding works from documentation.

Phase 2 met this Definition of Done on 2026-07-18 and enabled the now-completed Phase 3 foundation.

---

# Phase 3 — API, GraphQL and Application Shell Foundation

## Status

```text
COMPLETED — 2026-07-18
```

## Goal

Restore the originally approved GraphQL/Apollo architecture and prepare Web for all future modules.

## Backend

- NestJS GraphQL module with Apollo driver;
- code-first schema with generated `schema.gql`;
- GraphQL context and authentication;
- permission guard integration;
- stable error codes and error formatting;
- pagination conventions;
- scalar conventions;
- request-scoped DataLoaders;
- query depth, complexity and page-size limits;
- GraphQL schema tests;
- Users pilot queries;
- Auth mutations after session contract approval.

## Frontend

- Apollo Client for RSC and Client Components;
- GraphQL Codegen;
- generated typed operations;
- cache policies;
- TanStack Query for REST/media operations;
- TanStack Table and Virtual;
- Zustand stores with explicit ownership;
- React Hook Form and Zod;
- shared loading/error/empty states;
- DSS Application Shell;
- global navigation, search placeholder, notifications placeholder, user menu and module shells.

## Definition of Done

- Users/Auth vertical slice works through GraphQL;
- REST and GraphQL share application services;
- Web consumes generated operations;
- schema/codegen checks run in CI;
- no entity is cached by both Apollo and TanStack Query.

Phase 3 met this Definition of Done on 2026-07-18. The active delivery stage is Phase 4.

---

# Phase 4 — Core Platform Services

## Status

```text
COMPLETED — 2026-07-18
```

## Goal

Implement the shared capabilities required by Media and all product modules.

## Events and Outbox

- domain, integration and system events;
- versioned event envelope;
- PostgreSQL transactional outbox;
- at-least-once delivery;
- idempotent consumers;
- correlation and causation IDs;
- retry and dead-letter behavior.

Delivered in the first Phase 4 package:

- versioned JSON-safe event envelope and factory;
- explicit domain/integration/system event categories;
- PostgreSQL outbox lifecycle schema and focused migration;
- transaction-only `OutboxWriterService`;
- correlation, causation, actor and aggregate context;
- integration proof that primary data and events commit or roll back together.

Dispatcher, BullMQ delivery, retries, dead-letter operations and consumer idempotency are delivered in the subsequent Phase 4 queue packages.

## Redis, Jobs and Worker

- Redis connection abstraction;
- BullMQ infrastructure;
- `apps/worker`;
- queue registry;
- job schema/version/idempotency conventions;
- scheduled jobs;
- job monitoring and retry operations.

Delivered in the second Phase 4 package:

- shared Redis connection lifecycle;
- BullMQ registry and versioned `@dss/jobs` contracts;
- conditional outbox claiming and automatic dispatch loop;
- deterministic event-based job identity;
- retry/backoff configuration and stale-lock recovery;
- separately buildable `apps/worker` runtime;
- PostgreSQL → BullMQ → worker integration coverage with duplicate protection.

Delivered in the third Phase 4 package:

- PostgreSQL consumer idempotency markers with stable versioned consumer identity;
- complete versioned event envelopes delivered to workers;
- terminal-failure persistence and a dedicated dead-letter queue;
- queue metrics, failed-job inspection and explicit operator retry;
- worker-level duplicate processing proof and queue recovery documentation.

## Audit

- immutable audit records;
- actor, target, reason, result and metadata;
- sensitive-data redaction;
- request/correlation linkage;
- application contract used by IAM, Auth, Media and moderation.

Delivered in the Audit Platform package:

- immutable indexed PostgreSQL audit records and focused migration;
- actor, target, result, reason, request, network and correlation context;
- recursive sensitive-data redaction before persistence;
- transaction-only `AuditWriterService` contract;
- IAM permission creation as the first sensitive application integration;
- commit, rollback and redaction integration coverage.

## Logging and Observability Baseline

- structured Pino logs;
- request IDs;
- OpenTelemetry traces and metrics;
- health/readiness/liveness separation;
- PostgreSQL, Redis and worker health;
- error tracking.

Delivered in the final Phase 4 package:

- request-scoped structured Pino logs for the API and structured worker logs;
- generated or propagated `x-request-id` response correlation;
- redaction of authorization, cookie and credential fields;
- OpenTelemetry Node SDK and automatic HTTP, Express, PostgreSQL and runtime instrumentation;
- low-cardinality HTTP request counters and duration histograms;
- separate liveness and dependency readiness endpoints;
- PostgreSQL, Redis, BullMQ and worker-heartbeat visibility;
- structured exception capture ready for an OTLP observability backend.

## Definition of Done

- one demonstrated transaction writes domain data and outbox event atomically;
- worker processes an idempotent job;
- retries and failures are observable;
- sensitive application action creates an audit entry.

Phase 4 met this Definition of Done on 2026-07-18. The active delivery stage is Phase 5.

---

# Phase 5 — Authentication, IAM, Access Groups and Security

## Existing foundation

- registration/login/refresh/logout;
- JWT issuing;
- password hashing;
- roles and permissions;
- guards and decorators;
- IAM CRUD/access assignment;
- protected-role safety foundation.

## Authentication completion

- Session becomes the active refresh lifecycle model;
- multi-device sessions;
- token rotation and revocation;
- active session management;
- email verification;
- forgot/reset password;
- login/security audit trail;
- brute-force protection;
- configurable cooldown and account locks;
- security email alerts;
- safe unlock flow;
- optional/admin-required 2FA decision and implementation.

## IAM and groups

- system roles: USER, MODERATOR, ADMIN, OWNER;
- custom access groups separated from system roles;
- allowlisted delegable permission builder;
- group display name, color, badge, icon, visibility and membership period;
- example groups: Editors, Knowledge Forge Guardians, Premium, Trusted Contributors, Trusted Instructors, Beta Testers;
- no custom group may grant generic moderation/admin/security capabilities;
- explicit authority policy for sanctions and protected actors.

## Security baseline

- Helmet and secure headers;
- CORS allowlist;
- rate limiting;
- GraphQL query cost controls;
- secrets policy;
- CSP and CSRF decision based on token transport;
- privacy and retention foundations.

## Definition of Done

- complete registration-to-verified-session flow works;
- session revocation is tested;
- brute-force policy is tested;
- custom groups cannot escalate authority;
- sensitive actions are audited;
- Auth REST/GraphQL surfaces use the same use cases.

---

# Phase 6 — DSS Media Platform v1 and Avatar

## Status

```text
COMPLETE
```

## Foundation

- align WIP Media model with the frozen specification before migration;
- Media, MediaVariant, MediaReference, MediaUploadSession and MediaAuditLog;
- status lifecycle: PENDING, UPLOADING, PROCESSING, READY, FAILED, REJECTED, QUARANTINED, DELETING, DELETED;
- visibility: PUBLIC, AUTHENTICATED, PRIVATE, RESTRICTED;
- Local, MinIO and S3-compatible storage contracts;
- safe storage keys;
- upload policies;
- ownership and references;
- MIME sniffing, extension and size validation;
- checksum;
- signed URLs;
- quotas and limits;
- cleanup and retention.

Delivered in the Media v1 foundation package:

- final media and upload lifecycle enums;
- `Media`, `MediaVariant`, `MediaReference`, `MediaUploadSession` and `MediaAuditLog` schema;
- Local, MinIO and S3-compatible provider identities;
- bucket plus opaque storage-key addressing without permanent domain URLs;
- authenticated/private/restricted visibility;
- reference-aware database deletion protection;
- aligned domain contracts and lifecycle transition tests.
- Prisma repository behind the Media domain boundary;
- centralized avatar, cover, content-image and attachment upload policies;
- declared MIME type, extension and size validation with focused tests.
- owner-scoped upload-session orchestration with opaque temporary keys;
- authenticated GraphQL initiate, inspect and abort operations.
- authenticated REST binary intake with content-based MIME inspection;
- exact size and optional SHA-256 verification with compensating cleanup;
- typed BullMQ media-processing queue and worker boundary.
- permanent PROCESSING Media identity before queue dispatch;
- Sharp WEBP conversion, EXIF auto-rotation and policy-driven variants;
- atomic READY/variant persistence with idempotent retries and FAILED state.
- GraphQL-issued signed delivery for authenticated/private/restricted media;
- explicit owner and `media.restricted.read` authorization;
- configurable, reference-aware orphan retention and idempotent physical cleanup;
- audited cleanup claim, completion and retryable failure states.
- mandatory asynchronous ClamAV scanning for every upload;
- fail-closed quarantine on detected malware or scanner outage;
- safe quarantine rescan transition and terminal-status idempotency.
- `media.quarantine.manage` permission with admin and owner defaults;
- GraphQL quarantine listing, rescan, and rejection operations;
- application-layer authorization and immutable audit records for quarantine decisions.
- `media.library.read` permission with admin and owner defaults;
- cursor-paginated GraphQL Media Library with lifecycle, ownership, visibility, search and orphan filters;
- aggregate original/variant storage usage and failed/quarantined/orphan counters.
- `media.jobs.manage` permission and GraphQL retry for failed processing;
- atomic FAILED-to-PROCESSING claims, immutable job-contract reuse, audit and queue-failure compensation.
- Mission Control Media Library route with authenticated server-side GraphQL;
- storage metric cards, lifecycle/visibility/kind/search/orphan filters and forward cursor navigation;
- permission-aware failure states and operator retry action.

## Processing — delivered foundation

- BullMQ media queues;
- Sharp processing worker;
- metadata extraction;
- EXIF cleanup;
- WEBP conversion;
- variants;
- idempotent retry;
- failure and quarantine flows.

## Avatar vertical slice — delivered

- `USER_AVATAR` policy;
- original plus 64/128/256 variants;
- square crop;
- `avatarMediaId` instead of `avatarUrl`;
- public delivery;
- previous-avatar reference removal;
- reference-aware retention and cleanup;
- default fallback;
- audit and tests.

## Definition of Done

- Avatar works end to end through Media;
- feature modules never call filesystem/S3 directly;
- private media has no permanent public URL;
- replacement and cleanup are tested;
- Media Library supports core operations.

---

# Phase 7 — Users, Profiles, Social Graph and Members Directory

## Status

```text
IN PROGRESS
```

Delivered in the Profile Foundation package:

- optional location and HTTPS/HTTP website fields;
- bounded technology and interest collections;
- whitespace normalization and case-insensitive duplicate removal;
- owner-authenticated GraphQL profile mutation;
- public profile projection through the existing Users boundary;
- clean PostgreSQL migration plus unit and E2E coverage.
- normalized, ordered social-link records with soft-disable semantics;
- transactional owner mutation, immutable audit entry and batched public
  GraphQL resolution.
- profile cover assignment and removal through DSS Media Platform;
- canonical responsive cover variants, active-reference protection and audit.
- owner-controlled profile privacy settings with privacy-safe defaults;
- enforced private-profile redaction for extended fields and social links.
- reversible follow/unfollow edges with follower and following counters;
- privacy-aware paginated social graph lists, batched GraphQL resolution and audit.
- reversible user blocks with owner-only lists and immutable audit;
- atomic bidirectional follow cleanup and centralized follow enforcement.
- privacy-safe Members Directory foundation with active-member search,
  deterministic sorting and bounded GraphQL pagination.
- IAM role filtering, role projections and privacy-safe online-only directory
  filtering;
- Redis TTL user presence with throttled durable last-seen updates;
- batched, privacy-enforced online status for profiles and Members Directory.
- Profile Wall text/image posts backed by DSS Media references;
- profile privacy, block enforcement, owner/author removal, audit and
  non-destructive tombstones;
- comments and reactions intentionally deferred to the shared interaction
  modules rather than duplicated inside Users.
- credential-confirmed account deactivation and reactivation through GraphQL;
- immediate access denial for non-active accounts, refresh-token clearing,
  durable session revocation and immutable lifecycle audit.
- credential-confirmed email and password changes with normalized email,
  verification reset, session revocation and durable JWT version rotation.
- session-backed access/refresh JWTs with hashed rotating refresh credentials;
- owner-visible device sessions, current-session projection, single-session
  revocation and atomic “revoke all others” behavior.

## Profile

- avatar and cover through Media;
- display name, bio, location, website and social links;
- technologies/skills and interests;
- registration/activity/last-seen information;
- privacy settings;
- badges, selected title, level, points and reputation;
- social-network-style profile layout;
- profile completion.

## Account Settings

- personal information;
- email/password changes;
- sessions;
- notification preferences;
- privacy;
- avatar/cover;
- deactivation/deletion flow.

## Profile Wall

- registered users may post text, image or text+image;
- privacy controls;
- comments/reactions where approved;
- moderation, tombstones and reports.

## Followers and friends

- follow/unfollow;
- follower/following counters and lists;
- privacy controls;
- activity/feed integration;
- block enforcement;
- optional mutual-follow “friends” projection rather than a separate duplicate graph.

## Members Directory

- all users;
- search, filters and sorting;
- role/group/title filters;
- online status;
- top month/year/all time;
- top-5 cards;
- activity, reputation and contribution columns;
- pagination;
- GraphQL projections and TanStack Table.

## Presence

- Redis TTL presence;
- users, guests and crawler/bot metrics;
- visible/hidden privacy;
- last activity without invasive tracking.

## Definition of Done

- public profile and settings are complete;
- follow and wall flows are moderated and tested;
- Members Directory matches the approved mockup behavior;
- privacy is enforced on the API.

---

# Phase 8 — Gamification, Reputation, Points, Levels and Titles

## Direct reputation

- visible author and mandatory reason;
- `+` and `-`;
- one rating from actor to a specific recipient per rolling 24 hours;
- configurable minimum account age;
- recipient sees actor, reason, value and reversal;
- moderator/admin reversal with mandatory reason;
- immutable reversible Reputation Ledger;
- anti-abuse signals and caps.

## Community Points

Initial configurable events:

- comment: +1;
- forum topic: +5;
- published news: +10;
- published Knowledge Forge article: +50;
- direct reputation +1: +10;
- direct reputation -1: -10.

All points use a reversible ledger. Deleted/moderated/unpublished content may reverse awarded points.

## Levels

- configurable level thresholds;
- current level and progress to next level;
- level history;
- leaderboards derive from Community Points rather than an unexplained composite score.

## Custom titles

- admin-created title with name, color and badge;
- multiple titles per user;
- one selected display title;
- title-change cooldown configurable as N days;
- awards such as User of the Year, Best Author and contest winner;
- titles do not grant permissions.

## Achievements

- rule-based and manually awarded achievements;
- profile badges;
- idempotent event consumption;
- moderation-aware rollback;
- cooldowns and daily caps.

## Definition of Done

- every points/reputation change is explainable and reversible;
- leaderboards support month/year/all-time;
- spam cannot trivially dominate rankings;
- titles, groups and roles remain distinct.

---

# Phase 9 — Interaction Platform, Shared Content, Editor, Content Gates and Activity Feed

## Interaction Target Registry

- one canonical target identity for News, Community Hub, Research Lab,
  Knowledge Forge, Academy, profile walls and future modules;
- real foreign-key ownership for shared interactions instead of unconstrained
  `targetType + targetId` records;
- domain modules register targets and remain responsible for their own
  publication, locking and visibility policies;
- shared capabilities operate only after the owning domain authorizes the
  requested action;
- counters are rebuildable projections, never the sole source of truth.

## Interaction bounded contexts

- Comments owns comment bodies, reply trees, edit history, mentions,
  tombstones, reports and moderation annotations;
- Reactions owns idempotent content reactions and vote aggregates;
- Bookmarks owns private saved-item relationships;
- Reputation owns a separate immutable and reversible user-to-user ledger;
- Content Access owns reusable `ALL`/`ANY` gates and entitlement evaluation;
- Community Points remains distinct from direct Reputation;
- a content vote never changes author reputation implicitly unless an explicit,
  audited domain rule creates a separate ledger entry.

## Cross-module architecture rules

- News, Community Hub, Research Lab, Knowledge Forge and Academy must not
  create private duplicate comment, reaction or bookmark tables;
- the first forum post, news body, article revision and lesson content remain
  entities of their owning modules rather than generic comments;
- Media attachments use DSS Media Platform references;
- moderation and sanctions remain owned by the Moderation platform;
- unauthorized gated content is removed at the API boundary, not merely hidden
  by the frontend;
- public interaction content uses tombstones and audit trails; security
  secrets, sessions, tokens and caches follow their required deletion rules.

## DSS Editor

- Tiptap/ProseMirror core;
- versioned JSON document schema;
- full, forum and compact presets;
- Media Reference, Content Gate, code, mention and attachment nodes;
- Shiki VS Code-style highlighting;
- preview, drafts and autosave;
- sanitized derived HTML/plain-text/search projections;
- server-side schema validation;
- no arbitrary user HTML.

## Comments, reactions and bookmarks

- reusable Comment, Reaction and Bookmark modules backed by Interaction
  Targets;
- top-level comment plus replies for content modules;
- edit history, tombstones, mentions, reports and moderation;
- reactions/votes with idempotent records;
- bookmarks/saved items with private ownership.

## Content Gates

- hide text, image, code or file blocks;
- `ALL` and `ANY` rule operators;
- global counters: account age, comments, forum posts, publications and reputation;
- group/entitlement rules;
- standard and extended limits;
- Premium always bypasses ordinary gates and sees an unlocked Premium notice;
- read-only/ban overrides Premium;
- API never returns unauthorized hidden content;
- visually explicit locked/unlocked states.

## Activity Feed

- event-based activity projection;
- guest public activity;
- authenticated activity since last visit;
- subscriptions, interests, mentions and own activity;
- deterministic recommendations before AI augmentation;
- unread markers and module filters.

## Definition of Done

- one canonical document can render safely across modules;
- hidden content cannot be extracted from unauthorized responses;
- feed survives failure of optional AI summaries;
- shared capabilities do not erase domain ownership.

---

# Phase 10 — News Platform

## Scope

News is a separate moderated news module, not a personal-blog system.

## Content

- category;
- title and slug;
- short description;
- full structured content;
- preview/cover;
- gallery;
- files;
- author;
- tags;
- related news;
- source/canonical metadata;
- language;
- SEO;
- revision history;
- scheduled publication;
- visibility and Content Gates;
- reactions, comments and bookmarks;
- unique views and aggregate counters.

## Publication workflow

```text
DRAFT → IN_REVIEW → SCHEDULED/PUBLISHED → ARCHIVED
```

- normal users submit for review;
- Editors may publish according to narrow editorial permissions;
- ordinary users cannot publish without premoderation;
- editorial actions are audited.

## Pinned news

- global or category scope;
- visible Pinned badge;
- optional expiration;
- separate presentation before normal sorting;
- no duplication in the regular list.

## Definition of Done

- author-to-review-to-publication flow works;
- comments, votes, bookmarks and views work;
- editor supports code, Media and Content Gates;
- pinned and scheduled content behave correctly;
- News contributes to Feed, Search, SEO, Notifications and Gamification.

---

# Phase 11 — Knowledge Forge

## Scope

- hierarchical categories and navigation;
- pages and manuals;
- tags and internal links;
- attachments and Media references;
- revision history;
- diff, edit summary and rollback;
- contributors;
- protected pages;
- discussion/comments;
- search and related pages.

## Workflow

- ordinary user edits always require review;
- Knowledge Forge Guardians may review/publish/reject/rollback revisions without becoming moderators;
- every revision is preserved;
- realtime collaborative editing is not required for 1.0.

## Definition of Done

- no edit destroys prior history;
- normal and Guardian workflows are permission-tested;
- published pages feed Search, SEO, Activity and Gamification.

---

# Phase 12 — Research Lab

## Scope

Long-form analytical and technical publishing distinct from News and collaborative Knowledge Forge.

- research entries;
- technical articles;
- guides and tutorials;
- case studies;
- research notes and reports;
- categories, technologies, tags and collections;
- authors and subscriptions;
- drafts and publication workflow;
- covers, inline Media and attachments;
- comments, reactions and bookmarks;
- reading time, table of contents and revisions;
- featured/recommended content;
- SEO and Search.

## Definition of Done

- approved canonical Research Lab mockups are implemented;
- author/reviewer/publication flow works;
- content supports the full DSS Editor;
- Activity, Search, SEO, Notifications and Gamification integrations work.

---

# Phase 13 — Community Hub / Forum

## Product direction

Combine the structured organization of IPB/XenForo/vBulletin with selected Reddit-style voting and discovery.

## Structure

- categories;
- forums and optional subforums;
- topics and posts;
- pinned, locked and archived topics;
- drafts, preview, tags, attachments and polls;
- question topics and accepted answers;
- subscriptions and bookmarks;
- mentions and notifications;
- hot/new/top sorting;
- view/reply/activity counters.

## Posts

- replies, quotes and mentions;
- compact editor with code/Media;
- edit history;
- tombstones;
- reactions/upvotes/downvotes;
- reports and moderation annotations.

## Topic curators

- assigned by moderator/admin from normal users;
- edit first post;
- hide/delete replies with tombstones;
- lock/unlock topic;
- no general sanction, IAM or security capabilities;
- all actions audited.

## Definition of Done

- approved list/topic mockups are implemented;
- votes and reputation remain separate;
- curator scope cannot escape its topic;
- moderation, Feed, Search, Notifications and Gamification work.

---

# Phase 14 — Moderation, Sanctions, Appeals and Security Deck

## Warnings

- mandatory reason;
- temporary or indefinite-until-revoked;
- configurable threshold for automatic read-only;
- public annotation on the relevant content.

## Read-only

- may read public content;
- cannot see hidden content;
- cannot create/edit/comment/rate/upload/download/message;
- moderator may issue only temporary read-only to normal users;
- admin may issue temporary or permanent read-only subject to authority rules;
- automatic expiration;
- mandatory reason and audit.

## Ban and appeals

- temporary and permanent ban;
- protected authority hierarchy;
- no self-ban;
- restricted authenticated ban page;
- reason and appeal form;
- one appeal per sanction;
- SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED;
- administrator review;
- reviewer conflict warning when reviewer issued the sanction.

## Public moderation annotations

- blue warning;
- yellow read-only;
- red ban/removal;
- actor, reason, time, expiration and status;
- revoked/expired annotations remain as history.

## Security intelligence

- staff-only post metadata;
- masked IP for standard moderator view;
- full sensitive data only with explicit permission;
- IP/ASN/country/browser/OS/device-category/session history;
- account correlation search;
- risk signals rather than automatic guilt;
- strict audit and retention;
- one-click transition from content card to Security Deck.

## Definition of Done

- authority boundaries are tested;
- banned user appeal flow works;
- read-only enforcement is centralized;
- sensitive-data access is audited;
- normal public content deletion produces tombstones and staff visibility;
- redaction/purge exists for privacy, legal, malware and secrets.

---

# Phase 15 — Communications, Notifications and Email

## Private messages v1

- one-to-one conversations;
- text, code and files;
- unread/read state;
- block enforcement;
- mute conversation;
- abuse reporting;
- Media attachments;
- no voice/video;
- no three-or-more-user rooms in 1.0.

## Notifications

- in-app notifications;
- unread counter;
- mentions through `@username`;
- private messages;
- reputation changes;
- comments/replies/subscriptions;
- publication/review events;
- support events;
- grouped/deduplicated notifications;
- preferences and email fallback.

Admin notifications include:

- News awaiting review;
- Knowledge Forge revisions awaiting review;
- Academy courses awaiting review;
- new support tickets;
- moderation/security alerts;
- failed jobs and operational warnings where appropriate.

## Email

- transport abstraction;
- localized templates;
- queues, retry and delivery audit;
- verification, reset, security, mention, support and digest templates;
- Mailpit or equivalent in development.

## Realtime

- GraphQL subscriptions may be added using `graphql-ws` and Redis-backed PubSub;
- in-memory PubSub is not a production solution;
- polling remains an acceptable fallback.

## Definition of Done

- private messages and attachments are access-controlled;
- notifications reflect preferences;
- email failures do not roll back domain actions;
- unread counts remain consistent.

---

# Phase 16 — Downloads and Structured File Catalog

## Scope

- categories;
- resources/products;
- versions and artifacts;
- descriptions and requirements;
- screenshots;
- licenses;
- release notes/changelog;
- checksums;
- download counters/history;
- ratings/reactions/comments;
- bookmarks and version notifications;
- search, sorting and filters;
- moderation and reports;
- Content Gates and visible hidden-file placeholders.

## Boundary

- Media owns physical files and access delivery;
- Downloads owns the public structured catalog;
- Media Library is the admin view of all Media and is never exposed as a public dump.

## Definition of Done

- protected artifacts cannot be accessed by direct storage URL;
- version publication and immutable artifacts work;
- hidden downloads show requirements without leaking content;
- checksum and download audit work.

---

# Phase 17 — Academy 1.0

## Content

- user-created course drafts;
- modules/sections and ordered lessons;
- text, video, code and downloadable materials;
- difficulty and estimated duration;
- DSS Editor and Media integration.

## Learning

- enrollment;
- lesson completion;
- course progress;
- continue learning;
- bookmarks;
- completed courses;
- Command Deck integration.

## Assessment

- quizzes;
- answers and scores;
- passing threshold;
- attempts;
- completion certificates.

## Publication

- all ordinary user courses require review in 1.0;
- author, reviewer and publisher permissions are separate;
- publishing emits Search, SEO, Activity and Notification events.

## Out of scope

- AI Mentors;
- AI homework grading;
- conversational course tutor;
- advanced premium LMS/economy.

## Definition of Done

- user can create, submit, enroll, learn, complete and receive a certificate;
- progress is reliable and idempotent;
- course review is enforced.

---

# Phase 18 — Support Center, Public Roadmap and Releases

## Requests

- support/problem request;
- bug report;
- feature request;
- feedback;
- attachments;
- staff assignment;
- public/private visibility;
- comments/replies and internal staff notes;
- status history.

## Status model

```text
SUBMITTED
TRIAGED
PLANNED
IN_PROGRESS
IN_REVIEW
IN_TESTING
COMPLETED
REJECTED
DUPLICATE
CLOSED
```

Allowed statuses depend on request type.

## Feature requests and roadmap

- voting;
- staff response;
- duplicate relation;
- linked roadmap item;
- linked release;
- public progress.

## Releases / Version History

- version;
- title and summary;
- status and release date;
- categorized change entries;
- breaking changes;
- linked bugs/features/roadmap items;
- public changelog.

## Definition of Done

- user can submit and follow a request;
- staff workflow and notifications work;
- completed work can be connected to a release and public changelog.

---

# Phase 19 — Command Deck, Universe Feed and Personalization

## Universe Landing

- compelling guest presentation;
- module overview;
- real public activity and statistics;
- featured News/Research/Forum/Academy/Downloads;
- registration/login CTA;
- SEO, accessibility and responsive behavior.

## Universe Feed

- activity since last visit;
- new topics, posts, comments, News, Knowledge Forge, Research and courses;
- mentions, replies and reputation changes;
- subscriptions/followed users/categories/topics;
- unread markers and filters;
- deterministic recommendations;
- AI-generated summary as optional enhancement.

## Command Deck

- level, XP/Community Points, selected title and streak;
- achievements and certificates;
- Academy progress;
- saved items;
- personal tasks in a simple 1.0 form;
- own publications/discussions;
- quick actions;
- events;
- ready-made configurable widget layouts;
- AI Copilot behind capability/feature controls.

## Explicitly later

- voice spaces;
- advanced project management;
- arbitrary drag-and-drop dashboard builder;
- full AI agent workspace.

## Definition of Done

- guest and signed-in `/` experiences differ correctly;
- Feed and Command Deck do not duplicate responsibilities;
- optional AI failure does not break the dashboard.

---

# Phase 20 — Theme Platform, CMS, Public Website and SEO

## Theme Engine

- semantic design tokens;
- dark/light/system;
- SSR-safe initialization;
- preference persistence;
- module accents;
- accessible contrast;
- one active published theme with fallback.

## Theme Builder

- draft and preview;
- allowlisted token editing;
- validation and contrast checks;
- publish and rollback;
- version history;
- no arbitrary CSS or component markup changes.

## CMS Builder

- homepage sections;
- public/system/legal pages;
- navigation and footer;
- reusable content blocks;
- announcements and maintenance message;
- branding;
- draft/review/schedule/publish/archive;
- preview.

## SEO

- global/per-page metadata;
- canonical URLs;
- Open Graph and social cards;
- Schema.org;
- sitemap and robots;
- indexation permissions;
- redirects;
- 404/broken-link monitoring;
- hreflang;
- preview and audits;
- external webmaster integrations incrementally.

## Definition of Done

- public pages are CMS-managed;
- theme changes do not require component rewrites;
- critical pages pass accessibility and SEO checks.

---

# Phase 21 — AI Core

## Principle

AI Core is a cross-cutting optional capability, not a required dependency of normal product flows.

## 1.0 integrations

- authenticated activity summary;
- News titles, descriptions, drafts, tags, SEO and cover generation;
- code generation/explanation in Forum/comments/editor;
- thread and ticket summaries;
- Academy outlines, lesson drafts and quiz drafts;
- duplicate feature-request suggestions;
- moderation and analytics assistance;
- Research assistance where approved.

## Platform requirements

- provider/model abstraction;
- prompt and schema versioning;
- structured outputs;
- quotas;
- usage and cost ledger;
- permissions;
- privacy policy and redaction;
- safety/moderation;
- cancellation, retry and timeout;
- generated-content labeling;
- human confirmation before publication;
- audit.

## Out of scope

- autonomous publication;
- advanced multi-agent ecosystem;
- Academy AI Mentors and automated homework grading.

## Definition of Done

- every AI feature has a deterministic non-AI fallback where the underlying user flow is essential;
- costs and usage are observable;
- private content is never sent without explicit policy.

---

# Phase 22 — Mission Control, Analytics and Operations

## Mission Control

- platform dashboard;
- user and module administration;
- moderation queues;
- publication queues;
- support operations;
- feature flags;
- system settings.

## Analytics Builder

- approved metric catalog;
- configurable widgets;
- date ranges, filters and grouping;
- comparison periods;
- saved reports;
- CSV export;
- role-based report access;
- no arbitrary browser SQL.

Metrics include users, content, forum, reputation, moderation, Academy, Downloads, Support, Media, AI, security and jobs.

## Maintenance Center

- maintenance and read-only modes;
- queue pause/retry;
- cache operations;
- database, Redis, storage and search diagnostics;
- search reindex;
- sitemap rebuild;
- orphan cleanup;
- system announcements;
- failed-job operations.

## Definition of Done

- administrators can operate core platform capabilities without direct database access;
- every sensitive operation is permission-protected and audited;
- analytics do not block domain transactions.

---

# Phase 23 — Hardening, Testing and Documentation

## Security

- complete permission audit;
- Content Gate bypass tests;
- sanctions and authority tests;
- upload/file security;
- session/token rotation;
- secrets review;
- security headers and CORS;
- suspicious login tracking;
- account lock/unlock;
- sensitive-data retention and access audit;
- 2FA requirement for privileged users if approved.

## Testing

- unit tests for domain policies;
- repository/database integration tests;
- GraphQL and REST e2e;
- Auth/IAM/Media/Forum/CMS critical flows;
- worker/job tests;
- migration tests;
- seed verification;
- Playwright user journeys;
- accessibility audits;
- performance baseline;
- load tests for Feed, Forum, Search and uploads.

## Documentation

- root README;
- local/Docker setup;
- environment reference;
- architecture overview;
- canonical module passports;
- GraphQL and REST API documentation;
- testing, migration and deployment guides;
- operations/runbooks;
- ADRs;
- troubleshooting;
- changelog and version history.

## Definition of Done

- no release gate is manual-only without documentation;
- critical flows have automated coverage;
- documentation matches production behavior.

---

# Phase 24 — Release Candidate

## RC checklist

- clean installation from zero;
- all migrations apply to a production-like database;
- seed and first-owner creation work;
- registration, verification, login, reset and sessions work;
- GraphQL schema and generated clients are stable;
- all required modules are available;
- permissions and sanctions are verified;
- uploads, variants, downloads and cleanup work;
- email, notifications and queues work;
- production builds are green;
- Docker/staging deployment is green;
- logging, tracing, metrics and alerts work;
- backups are configured;
- restore test succeeds;
- privacy policy, terms, cookie consent and security policy exist;
- initial content and moderation rules are populated;
- canonical mockup acceptance review is complete.

## Release blockers

- failed build/typecheck/lint;
- unsafe migrations;
- untested critical Auth/IAM/Media paths;
- permission boundary violations;
- hidden-content leakage;
- missing backup/restore plan;
- inaccessible critical flows;
- documentation that contradicts the system.

---

# Phase 25 — DSS Universe 1.0

DSS Universe 1.0 is complete when:

- the platform installs from documentation;
- Web, API, worker, PostgreSQL, Redis and storage operate reliably;
- GraphQL/Apollo and required REST surfaces are stable;
- Auth, sessions, IAM, access groups and security are complete;
- Media Platform is the only file lifecycle boundary;
- profiles, social graph, reputation, points, levels and titles work;
- News, Knowledge Forge, Research Lab, Community Hub, Academy, Downloads, Communications and Support provide their approved 1.0 core flows;
- Universe Feed and Command Deck are functional and distinct;
- Mission Control, Security Deck, CMS Builder, Media Library and Maintenance Center can operate the platform;
- CMS, Themes and SEO work;
- AI integrations are safe, optional and observable;
- critical scenarios are tested;
- logs, metrics, alerts, backups and recovery are operational;
- documentation and release history match reality;
- the platform is ready for a real public launch.

---

## 6. Explicitly Out of Scope for 1.0

- microservice decomposition;
- Kafka;
- paid Premium billing and payment providers;
- marketplace;
- mobile applications;
- voice/video messages;
- group chat rooms with three or more participants;
- voice spaces;
- realtime collaborative editors;
- Academy AI Mentors and AI homework grading;
- advanced AI agent ecosystem;
- arbitrary drag-and-drop dashboard builder;
- full enterprise DAM;
- video transcoding farm;
- complex internal economy/tokens;
- advanced LMS features;
- enterprise multi-tenancy;
- Elasticsearch/OpenSearch before measured need.

---

## 7. Current Position

```text
Completed foundation:
  product/architecture reconciliation, engineering quality gate,
  GraphQL/Apollo API, Auth/Users GraphQL vertical slice,
  generated Web operations and DSS Application Shell

Current work:
  Phase 4 — Core Platform Services

Uncommitted technical WIP:
  early Core Storage and Media skeleton

Next implementation sequence:
  Events/Outbox → Redis/Jobs/Worker → Audit/Observability →
  aligned Media/Avatar
```

---

## 8. Roadmap Maintenance

This roadmap changes only through an explicit product/architecture decision.

When a decision changes:

1. update this roadmap;
2. update the System Design or relevant module specification;
3. add/update an ADR when architectural;
4. update the Project Context status;
5. update release/version history in its dedicated workflow;
6. do not silently reinterpret approved mockups or requirements in code.
