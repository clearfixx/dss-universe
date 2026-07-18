# DSS Universe 1.0 — Canonical System Design

> Status: Approved architecture baseline
>
> Updated: 2026-07-18
>
> Scope: DSS Universe 1.0

## 1. Purpose

DSS Universe is a modular developer platform combining knowledge publishing, community, learning, files, communication, support, gamification, administration and AI-assisted workflows.

This document defines system boundaries and integration rules. Product sequencing lives in the canonical Roadmap. Detailed domain rules live in module specifications and ADRs.

## 2. Sources of Truth

Precedence for 1.0 decisions:

1. `docs/roadmap/DSS_UNIVERSE_1.0_ROADMAP.md` — scope and delivery sequence;
2. this System Design — platform architecture and ownership;
3. `docs/product/MODULE_MAP.md` — canonical product names and surfaces;
4. accepted ADRs — architectural decisions;
5. module specifications and README files — local rules;
6. `docs/design/MOCKUP_CATALOG.md` — visual and interaction direction;
7. source code and schema — implementation reality, not authority for unapproved product scope.

When code contradicts an approved specification, the contradiction must be resolved explicitly rather than silently treating code as the desired design.

## 3. Product Surfaces

### Public and user

- guest landing at `/`;
- authenticated Universe Feed at `/`;
- Command Deck at `/command-deck`;
- Astronaut Profile and Members Directory;
- News;
- Research Lab;
- Knowledge Forge;
- Community Hub;
- Academy;
- Downloads;
- Communications;
- Support Center;
- AI Core integrations.

### Administration

- Mission Control — general administration;
- Security Deck — security and moderation;
- CMS Builder — public pages and branding;
- Media Library — DSS Media Platform operations;
- Maintenance Center — system operations;
- Analytics Builder — approved reports.

## 4. High-Level Architecture

```text
Browser
  |
  v
DSS Web (Next.js App Router)
  |  GraphQL for product data
  |  REST for files, health, webhooks and transport-specific flows
  v
DSS API (NestJS modular monolith)
  |-- feature modules
  |-- shared platform capabilities
  |-- core infrastructure
  |
  +--> PostgreSQL / Prisma (source of truth)
  +--> Redis / BullMQ (cache, limits, jobs, locks, presence)
  +--> MinIO / S3-compatible storage (binary objects)
  +--> Search index (derived projection)
  +--> external email and AI providers

DSS Worker
  +--> consumes outbox/integration jobs
  +--> media processing, search, notifications, email, analytics and cleanup
```

The initial deployment is a modular monolith with a separate worker. Module boundaries must allow later extraction without requiring premature microservices.

## 5. Backend Layers

```text
Presentation (GraphQL resolvers / REST controllers)
  -> Application (use cases and orchestration)
    -> Domain (entities, policies, repository contracts)
      -> Infrastructure (Prisma, storage, queues, providers)
```

Rules:

- domain code does not depend on NestJS, Prisma, GraphQL or HTTP;
- resolvers/controllers remain thin;
- application services enforce use-case order and transaction boundaries;
- persistence is accessed through repository contracts;
- mappers separate persistence, domain and public API representations;
- modules never import another module's Prisma repository;
- cross-module secondary effects use events/jobs;
- synchronous feature-to-feature calls require an explicit public application contract.

## 6. API Model

GraphQL and REST are complementary.

### GraphQL

Use for product reads and mutations:

- profiles and members;
- content lists/details;
- Community Hub;
- Academy;
- Mission Control projections;
- notifications and activity;
- search and dashboard composition.

Requirements:

- Apollo Server in NestJS;
- Apollo Client in Web;
- generated TypeScript operations through GraphQL Code Generator;
- DataLoader for request-scoped batching;
- query depth/cost controls;
- persisted operations considered before public scale;
- resolvers call the same application services as REST.

### REST

Retain for:

- health/readiness;
- file upload/download and signed URL workflows;
- OAuth callbacks;
- webhooks;
- streaming/export endpoints;
- Swagger compatibility during migration.

## 7. Frontend State Ownership

- React Server Components own server-rendered page composition where appropriate.
- Apollo Client owns GraphQL server state and normalized cache.
- TanStack Query owns non-GraphQL asynchronous server state only.
- Zustand owns client application state: shell, local preferences, editor session coordination and transient workflows.
- TanStack Table owns complex tables; TanStack Virtual supports large lists.
- URL search parameters own shareable filters, sorting and pagination.

The same server response must not be independently cached in Apollo, TanStack Query and Zustand.

## 8. Data Ownership

| Data | Owner | Derived consumers |
| --- | --- | --- |
| Accounts and profiles | Users | Search, Members, Feed, Gamification |
| Credentials and sessions | Authentication / IAM | Security Deck, Audit |
| Roles, permissions, groups | Authorization / IAM | Every protected module |
| Media metadata and lifecycle | DSS Media Platform | Every file-consuming module |
| News | News | Search, Feed, Notifications, Gamification |
| Research publications | Research Lab | Search, Feed, Notifications |
| Collaborative knowledge | Knowledge Forge | Search, Feed, Gamification |
| Topics and replies | Community Hub | Search, Feed, Notifications, Gamification |
| Courses and progress | Academy | Command Deck, Feed, Gamification |
| Private messages | Communications | Notifications |
| Tickets and releases | Support Center | Notifications, Mission Control |
| Reputation, points, levels, titles | Gamification | Profiles, Members, Command Deck |
| Sanctions and appeals | Moderation | IAM, Security Deck, Content Gates |
| Notifications | Notification Platform | Web/email delivery |
| Search documents | Search Platform | Web search |
| Audit records | Audit Platform | Mission Control and Security Deck |

## 9. Events, Transactions and Jobs

A state-changing use case writes domain data and an outbox record in the same database transaction.

```text
Command
  -> validate permission and policy
  -> change owner-module state
  -> write outbox event atomically
  -> commit
  -> dispatcher publishes job/event
  -> idempotent consumers update projections or deliver side effects
```

Synchronous success must not depend on email, image resizing, indexing, analytics or AI generation.

Every job defines:

- stable name and versioned payload;
- idempotency key;
- retry/backoff policy;
- timeout;
- dead-letter/failed state;
- correlation and causation IDs;
- audit/metrics visibility.

## 10. Identity, Authorization and Groups

- permissions, not role-name checks, are the authorization source of truth;
- roles bundle platform permissions;
- custom groups may grant only an allowlisted set of user/content capabilities;
- groups cannot grant administrator, moderator, security-intelligence or audit permissions;
- Editors may publish News without premoderation;
- Knowledge Forge Guardians may review/publish/rollback knowledge revisions;
- Premium is manually assigned in 1.0 and bypasses normal Content Gates;
- sanctions override Premium and other bypasses;
- sensitive Mission Control actions require explicit permission and audit.

Sessions become first-class records. Refresh-token rotation, revocation, device/session visibility and security events must not remain a single hash stored on `User`.

## 11. Content Platform

### DSS Editor

- Tiptap/ProseMirror is the editing engine;
- canonical storage is validated JSON, not HTML or BBCode;
- server-side rendering generates sanitized HTML;
- Shiki renders `pre` and `code` blocks with a VS Code-like presentation;
- editor profiles control available nodes for full publications, Community Hub and comments;
- attachments reference DSS Media Platform IDs;
- Content Gate nodes are first-class structured nodes.

### Interactions

Shared capabilities include comments, reactions, bookmarks, mentions, unique views and reports. Ownership remains explicit: the interaction platform owns interaction records, while the content module owns publication state.

### Content Gates

Gate requirements support:

- comments count;
- publication count;
- reputation;
- account age configured in Mission Control;
- group membership;
- `ALL` or `ANY` evaluation.

Premium always sees gated content with a visible unlocked-gate treatment. Read-only, banned or otherwise sanctioned users do not receive the bypass.

## 12. Gamification

Direct reputation and Community Points are separate ledgers.

- one direct reputation decision from an actor to the same recipient per rolling 24 hours;
- `+` and `-` require a public reason and author identity;
- moderators may reverse reputation changes with audit history;
- Community Points are event-derived and idempotent;
- level thresholds and activity weights are configurable;
- custom titles include color/badge, multiple grants and a configurable display-change cooldown;
- rankings use an auditable score rather than an opaque AI formula.

## 13. Moderation and Deletion

Warnings, read-only sanctions, bans and appeals are modeled as records with issuer, reason, target, source content, timestamps and status.

- warnings may expire or be indefinite;
- moderator-issued read-only is time-limited;
- permanent read-only and permanent bans are admin-only;
- ban appeal submission is allowed once per active ban;
- public moderation annotations remain on affected content;
- moderators/admins see sanction history; users see their own history;
- topic curators receive narrow topic-scoped permissions.

Public content uses reversible soft deletion and visible tombstones. Security secrets, tokens, caches and legally/privacy-required data are hard-deleted or anonymized according to their lifecycle. Soft deletion is not a substitute for retention policy.

## 14. DSS Media Platform

DSS Media Platform is the only allowed file lifecycle boundary.

- feature modules declare intent/policy and store media references;
- Media owns metadata, upload state, variants, references, visibility and cleanup;
- Storage owns physical object operations behind a provider contract;
- processing and scanning are asynchronous;
- local storage is development-only;
- MinIO/S3-compatible object storage is the production direction;
- original filenames never become storage keys;
- private/restricted assets use authorized or signed delivery;
- avatar is the first complete vertical slice;
- Media Library is the administrative surface;
- Downloads is a curated public distribution module, not the Media Library.

## 15. Search, Feed and Notifications

Search, activity feed and notifications are derived projections.

- source modules publish committed events;
- consumers update indexes and feeds idempotently;
- deletion/unpublication removes or hides projections;
- search failure cannot corrupt source content;
- Universe Feed summarizes platform life since the user's last meaningful visit;
- Command Deck focuses on personal progress, tasks and recommendations;
- notifications cover messages, mentions, replies, reputation, moderation and workflow queues;
- email is a delivery channel, not the notification source of truth.

## 16. AI Core

AI Core is an optional cross-cutting capability, not a mandatory dependency of core workflows.

1.0 integrations may include:

- post-login activity summary;
- editor assistance;
- image-generation request for News covers;
- code generation in editors/comments;
- summarization and semantic search assistance;
- Mission Control assistance over approved metrics.

Requirements:

- provider abstraction and model routing;
- user confirmation before publishing generated content;
- prompt/output moderation;
- usage and cost accounting;
- timeouts, quotas and graceful fallback;
- durable generation IDs and audit metadata;
- no secret or unrestricted private-content leakage.

## 17. Theme Engine and CMS

Theme Engine supplies versioned design tokens for dark/light themes and future themes. Theme Builder edits validated tokens; it never accepts arbitrary executable CSS.

CMS Builder owns public pages, navigation, reusable blocks, branding, consent configuration and SEO content. It does not own News, Research, Knowledge Forge or Community Hub content.

## 18. Operations and Observability

Mission Control coordinates administrative use cases. Maintenance Center exposes safe operational commands for:

- system health;
- queues and failed jobs;
- cache invalidation;
- storage/orphan diagnostics;
- search reindex;
- sitemap rebuild;
- maintenance/read-only mode;
- announcements.

Observability baseline:

- structured logs with correlation ID;
- metrics for API, DB, Redis, queues, storage, search, media and AI;
- distributed tracing where useful;
- health, readiness and dependency status;
- immutable audit trail for sensitive actions;
- alerts for user-impacting failures.

## 19. Security and Privacy

- validate all external input;
- enforce authorization inside application use cases, not only UI/resolvers;
- rate-limit authentication, reputation, comments, messages, uploads and AI;
- use secure headers, CSRF strategy where relevant and strict CORS;
- sanitize rendered rich content;
- scan uploads and enforce MIME/magic-byte policies;
- protect GraphQL with cost/depth and pagination limits;
- minimize IP/device intelligence access and audit every inspection;
- define retention/anonymization/export policies before collecting expanded telemetry;
- do not infer precise ISP/device identity when evidence is unreliable.

## 20. Testing Boundaries

- unit tests for domain rules and policies;
- integration tests for repositories, transactions, outbox and storage;
- GraphQL/REST contract tests;
- end-to-end tests for critical product journeys;
- architecture tests for forbidden dependencies;
- migration tests;
- accessibility and visual regression tests for core surfaces;
- load/security tests for high-risk endpoints.

No phase is complete without tests proportional to its risk.

## 21. 1.0 Boundary

Included: approved Roadmap modules, one-to-one messages, manually assigned Premium, AI assistance with fallbacks, core themes and operational administration.

Excluded from 1.0:

- paid subscriptions/payments;
- voice/video calls;
- group message rooms;
- autonomous AI mentors and grading;
- marketplace/e-commerce;
- native mobile applications;
- arbitrary third-party plugins;
- microservice decomposition for its own sake.

## 22. Architecture Invariants

1. Every record and capability has one owner.
2. Feature modules do not access another feature's tables or infrastructure repository.
3. DSS Media Platform is the only file lifecycle boundary.
4. Permissions are checked server-side for every protected use case.
5. Secondary effects are event/job driven and idempotent.
6. Public deletion and security deletion follow different explicit policies.
7. GraphQL presentation types do not become domain entities.
8. AI failure does not break a non-AI core workflow.
9. Mission Control delegates to domain application contracts and records audit.
10. Documentation distinguishes implemented, WIP, approved and planned state.
