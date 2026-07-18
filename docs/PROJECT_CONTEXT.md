# DSS Universe — Project Context

> Status: Living project snapshot
>
> Updated: 2026-07-18 — Phase 3 complete
>
> Purpose: provide a compact, evidence-based orientation map for developers and AI assistants before changing DSS Universe.

---

## 1. Product

DSS Universe is a modular developer platform built around:

> Build. Share. Learn. Grow. Together.

The 1.0 product includes a public website, authenticated Universe Feed, Command Deck, profiles, News, Knowledge Forge, Research Lab, Community Hub, Academy, Downloads, Communications, Support Center, gamification, Mission Control, CMS, DSS Media Platform, AI Core, search, notifications, security, analytics and production operations.

The approved product roadmap lives in:

- `docs/roadmap/DSS_UNIVERSE_1.0_ROADMAP.md`

The detailed system design supplied during planning is still a canonical draft and must be reconciled with the approved roadmap before being copied into the repository as a frozen system specification.

---

## 2. Current Repository State

### Branch

```text
feature/developer-onboarding
```

At the time of this snapshot the active branch contains the first Media v1
foundation package, pending its final quality gate and publication.

### Stable implemented foundation

- monorepo with pnpm workspaces and Turborepo;
- NestJS API;
- Next.js Web application;
- PostgreSQL and Prisma;
- Redis and pgAdmin in Docker Compose;
- configuration namespaces and environment validation;
- Prisma service and database exception translation;
- shared pagination contracts;
- health endpoint;
- Swagger foundation;
- JWT authentication;
- authorization permissions and guards;
- IAM roles, permissions and direct user access management;
- Users reference module with layered architecture;
- repository contracts, mappers, response DTOs and list pagination;
- architecture, workflow and File Passport documentation;
- Apollo GraphQL code-first transport and generated schema;
- Auth and Users GraphQL vertical slice using existing application services;
- stable GraphQL error formatting, request limits and Users DataLoader;
- Apollo Client/Next.js integration and generated typed operations;
- TanStack Query/Table/Virtual, Zustand, React Hook Form and Zod foundations;
- responsive DSS Application Shell, guest presentation, Command Deck and module shells.
- versioned event-envelope contracts and transactional PostgreSQL outbox;
- transaction-only outbox writer with atomic commit/rollback integration coverage.
- Redis/BullMQ registry, outbox dispatcher and stale-lock recovery;
- shared versioned job contracts and separately buildable `apps/worker`;
- deterministic job identity with duplicate-dispatch integration coverage.
- shared Audit Platform and observability baseline;
- Media v1 persistence model, lifecycle state machine and relational contracts.

### Work in progress — not stable

- Core Storage abstraction;
- Local Storage provider;
- Media repository and application services;
- upload policy and processing pipeline;
- Media architecture documentation;
- Sharp dependency;
- Media module registration.

The Media persistence and domain foundation is implemented. Upload orchestration,
processing and delivery remain work in progress.

### Not implemented

- audit platform;
- notification and email platforms;
- search platform;
- structured logging and tracing;
- full session lifecycle;
- email verification and password recovery;
- production security baseline;
- Theme Engine and Theme Builder;
- DSS Editor;
- product modules beyond the current foundation.

---

## 3. Repository Map

```text
dss-universe/
├── apps/
│   ├── api/                 NestJS modular backend
│   └── web/                 Next.js App Router frontend
├── packages/
│   ├── eslint-config/       placeholder
│   ├── tsconfig/            placeholder
│   ├── types/               placeholder
│   └── ui/                  placeholder
├── docs/                    project documentation
├── standards/               engineering standards
├── tools/scripts/           development helper scripts
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

### API map

```text
apps/api/src/
├── core/
│   ├── auth/                request authentication infrastructure
│   ├── authorization/       effective permission checks
│   ├── config/              configuration and validation
│   ├── database/            Prisma, pagination, transactions, errors
│   ├── storage/             WIP physical storage abstraction
│   ├── swagger/             REST/OpenAPI documentation
│   ├── cache/               README only
│   ├── events/              README only
│   ├── logger/              README only
│   ├── mail/                README only
│   ├── queue/               README only
│   ├── scheduler/           README only
│   └── security/            README only
├── health/
├── modules/
│   ├── auth/
│   ├── iam/
│   ├── media/               WIP skeleton
│   └── users/
├── shared/
├── app.module.ts
└── main.ts
```

### Web map

```text
apps/web/src/
├── app/                     guest landing, Command Deck and module routes
├── components/ui/           shared shadcn/Radix components
├── components/providers/    Apollo and TanStack Query ownership boundary
├── components/shell/        DSS Application Shell and dashboard composition
├── components/states/       shared loading, empty and error states
├── config/                  site and design-system config
├── features/                mostly placeholders
├── gql/                     generated GraphQL operations and types
├── graphql/                 authored GraphQL operation documents
├── lib/apollo/              RSC/client Apollo configuration and cache policy
├── stores/                  Zustand client-state stores
└── lib/                     utilities and REST client
```

Before writing Next.js code, read `apps/web/AGENTS.md` and the relevant local Next.js documentation under `node_modules/next/dist/docs/`.

---

## 4. Architecture

### Backend style

NestJS modular monolith with explicit module ownership.

```text
Presentation
    ↓
Application
    ↓
Domain
    ↓ repository contract
Infrastructure
    ↓
Prisma / external adapter
```

### Dependency direction

```text
Feature Module
    ↓
Platform Capability
    ↓
Core Infrastructure
```

Rules:

- domain does not depend on NestJS, Prisma, GraphQL or HTTP;
- controllers and GraphQL resolvers are thin;
- application services own use cases;
- Prisma remains behind repository contracts;
- feature modules do not use another module's infrastructure directly;
- cross-module secondary effects prefer integration events;
- critical events eventually use a transactional outbox;
- public API models do not expose Prisma records;
- new source files follow the DSS File Passport standard.

### API strategy — implemented foundation

```text
GraphQL + Apollo
├── product queries
├── product mutations
└── later subscriptions

REST
├── health/readiness/liveness
├── media upload/download streams
├── webhooks and callbacks
└── operational endpoints
```

GraphQL presentation types remain separate from application/domain models. REST controllers and GraphQL resolvers call the same application services.

---

## 5. Approved Technology Stack

### Runtime and applications

- Node.js LTS — exact supported version still must be pinned;
- TypeScript;
- NestJS 11;
- Next.js 16 App Router;
- React 19;
- Express adapter.

### API

- GraphQL;
- Apollo Server;
- Apollo Client;
- GraphQL Code Generator;
- DataLoader;
- REST/OpenAPI for files and operational surfaces.

### Data and async

- PostgreSQL 17;
- Prisma 7;
- Redis;
- BullMQ;
- transactional outbox;
- PostgreSQL full-text search initially.

### Frontend

- Tailwind CSS 4;
- shadcn/ui and Radix UI;
- Apollo Client for GraphQL server state;
- TanStack Query for REST/file/operational server state;
- TanStack Table for complex data tables;
- TanStack Virtual for measured large-list use cases;
- Zustand for client application state;
- React Hook Form and Zod for forms;
- Tiptap/ProseMirror for structured editing;
- Shiki for VS Code-style syntax highlighting.

### Icons

- Lucide for normal product UI;
- Simple Icons for technologies and brands;
- local DSS SVG icons for module identity;
- no runtime dependency on a public icon CDN.

### Media

- DSS Media Platform;
- S3-compatible storage abstraction;
- Local adapter for simple development;
- MinIO for realistic development/staging;
- Sharp for images.

### Operations

- Pino structured logs;
- OpenTelemetry traces and metrics;
- error tracking provider;
- Jest, Supertest and GraphQL e2e for API;
- Playwright and accessibility checks for Web.

---

## 6. Approved Product Boundaries

### Public and user areas

- `/` is a presentation landing page for guests;
- `/` is an authenticated Universe Feed for signed-in users;
- Command Deck is the user's personal progress and productivity dashboard;
- Astronaut Profile is the public social profile;
- Account Settings is private account management.

### Administration

- Mission Control is the general administrative platform;
- Security Deck owns IAM/security intelligence/sessions/sanctions;
- CMS Builder owns public pages, navigation, content blocks and branding;
- Media Library is the administrative Media surface;
- Maintenance Center is the operational system surface.

Command Deck must not be used as the name of the admin platform.

### Content modules

- News is a separate moderated news module, not personal blogs;
- Knowledge Forge owns collaborative versioned manuals and articles;
- Research Lab owns analytical/research/technical long-form material;
- Community Hub owns forums, topics and posts;
- Academy owns courses, lessons, progress, assessments and certificates;
- Downloads owns the structured public file/resource catalog.

---

## 7. Key Approved Domain Decisions

### Authentication and access

- system roles: USER, MODERATOR, ADMIN, OWNER;
- custom access groups grant only allowlisted user/content capabilities;
- custom groups never grant generic moderator/admin/security permissions;
- Premium is a manually assigned access group in 1.0, without billing;
- sanctions override all groups and Premium privileges.

### Reputation and points

- content score and direct user reputation are separate;
- direct `+`/`-` requires a visible author and mandatory reason;
- an actor may rate a specific user once per rolling 24 hours;
- minimum account age is configurable in Mission Control;
- reputation and Community Points use reversible ledgers;
- levels are derived from Community Points;
- titles are presentation/gamification and do not grant permissions.

### Content Gates

- authors may gate text, image, code or attachment blocks;
- rules support `ALL` and `ANY`;
- global counters may include account age, comments, forum posts, publications and reputation;
- Premium bypasses normal gates but sees a visible unlocked notice;
- read-only and ban override Premium;
- server responses must not include content the viewer may not access.

### Moderation

- warning may be expiring or indefinite;
- moderator may issue temporary read-only to normal users;
- admin may issue permanent read-only and bans subject to authority rules;
- banned users receive a restricted authenticated appeal surface;
- one appeal per sanction;
- public moderation annotations remain on the relevant content;
- moderator/admin can see sanction history; users see their own history;
- topic curators have limited topic-local capabilities, not general moderation powers.

### Deletion

- normal public-content deletion creates a tombstone and preserves recoverable content for authorized staff;
- lifecycle distinguishes active, hidden, deleted, redacted and purged;
- security, privacy, malware, legal and retention requirements may require physical deletion;
- tokens, secrets, cache and other runtime data follow security-specific deletion rules.

### Editing

- Tiptap JSON is the canonical document format;
- HTML and plain text are derived projections;
- documents carry a schema version;
- full, forum and compact editor presets are separate;
- custom nodes include Media Reference, Content Gate, code, mentions and attachments;
- arbitrary user HTML is not trusted.

---

## 8. Current Data Model Reality

The committed schema has:

- User;
- Role;
- Permission;
- UserRole;
- UserPermission;
- RolePermission;
- Session.

The schema contains the aligned Media v1 foundation.

Known mismatches with the approved design:

- Auth still stores one `refreshTokenHash` on User while Session is not used by the auth lifecycle;
- User uses `avatarUrl`/`coverUrl` instead of Media references;
- Media repository and application workflows are not yet implemented;
- upload sessions are modeled but not yet orchestrated;
- roles and custom access groups are not yet separated;
- sanctions, appeals, reputation, points, titles, followers and wall models remain planned.

---

## 9. Quality Snapshot

Verified at Phase 2 completion on 2026-07-18:

- frozen-lockfile installation succeeds with pinned Node.js and pnpm versions;
- API and Web lint, typecheck and production builds pass;
- Prisma schema validation and client generation pass;
- Auth, IAM safety and Users baseline unit suites pass with critical-file coverage thresholds;
- API e2e boots the real application against isolated PostgreSQL and passes;
- Web component and Playwright Chromium smoke tests pass;
- architecture boundary validation passes;
- the dependency audit contains no high or critical advisories;
- GitHub Actions and Dependabot are configured;
- Web production builds no longer fetch Google Fonts.

Primary quality risks:

1. repository-wide API coverage remains low outside the critical Phase 2 baseline;
2. three moderate transitive dependency advisories remain and should be tracked through Dependabot;
3. no production security baseline is implemented yet;
4. no structured logging/observability is implemented yet;
5. the session model is incomplete;
6. the frontend remains a foundation shell;
7. historical documents must not override the canonical 1.0 Roadmap.

---

## 10. Immediate Execution Order

```text
1. Implement Media repository, upload policy and application foundation
2. Implement Media processing and Avatar vertical slice
3. Complete Auth sessions and User Profiles
4. Build Theme Engine and DSS Editor foundations
5. Continue product modules in the canonical roadmap order
```

Phases 1–4 were completed on 2026-07-18. The shared Events, Outbox, Redis, Jobs,
Worker recovery, Audit and Observability platforms are delivered. The
repository-wide formatting gate is operational, and the active delivery stage
is Phase 5.

---

## 11. Working Rules

- inspect current files before proposing code;
- preserve user changes and dirty worktree state;
- implement small logical packages;
- build/test after each package;
- commit only verified packages;
- update only documentation that became inaccurate;
- Version History is maintained in its dedicated workflow/chat;
- do not implement a planned abstraction merely because a README directory exists;
- distinguish `implemented`, `WIP`, `approved` and `planned` in every status report;
- never bypass repositories, application services, permissions, Media, Content Gates or audit boundaries.

---

## 12. Maintenance of This Snapshot

Update this file when any of the following changes materially:

- approved product scope;
- canonical architecture;
- technology stack;
- module completion status;
- database ownership;
- current execution phase;
- major known risks.

This file is an orientation cache, not a replacement for module specifications, ADRs, source code or release history.
