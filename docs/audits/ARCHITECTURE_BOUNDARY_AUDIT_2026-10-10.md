# DSS Universe — Architecture Boundary Audit

> Status: Static dependency audit complete; remediation design pending approval
>
> Date: 2026-10-10
>
> Scope: `apps/api/src/core`, `apps/api/src/modules`, architecture rules and the
> current boundary checker

## Executive result

The repository follows a recognizable layered module structure, but its runtime
dependency graph does not enforce the intended bounded contexts. The existing
architecture checker passes because it checks only a narrow subset of the
documented rules.

Confirmed high-impact violations are:

- Auth owns Users persistence and mapping decisions;
- four gamification modules inject broad foreign services;
- application services in Auth and IAM access Prisma directly;
- Prisma enums leak into domain, application and presentation;
- module public APIs export concrete services rather than narrow capabilities;
- architecture documents disagree about whether application services may use
  database services directly.

This debt can force a Knowledge Forge rewrite if Guardian identity,
authorization, editor delivery and gamification hooks are built on the current
couplings.

## Canonical rule conflict

`ARCHITECTURE_RULES.md` says application services must not contain
infrastructure-specific code and that infrastructure implements inward-facing
contracts. `module-boundaries.md` says services may use repositories/database
services. The older sentence is too permissive and contradicts the stronger
layering rule.

The approved rule should be:

```text
application service → module-owned port/repository contract
infrastructure adapter → Prisma/Redis/queue/provider
composition root → binds contract to adapter
```

Application services may coordinate repositories and capability ports. They
must not depend on `PrismaService`, Prisma models or another module's general
service.

## Auth and identity boundary

`AuthService` imports `UsersRepository` and `UserMapper` through deep relative
paths, and `AuthModule` imports `UsersModule`. The service creates a User during
registration and maps the resulting Users aggregate into authentication
responses. Its Passport explicitly describes creating accounts through Users,
which means the documentation faithfully records the wrong ownership.

Additional Auth application services inject `PrismaService` directly:

- email verification;
- login abuse protection;
- password recovery;
- two-factor authentication.

`AuthService` and the core JWT strategy also import Prisma `UserStatus`.

Required ownership split:

- Auth owns credentials, authenticators, sessions, recovery and verification
  challenges;
- an opaque subject/account capability answers whether authentication may
  proceed;
- Users owns profile and social data;
- IAM owns assignments;
- Authorization evaluates permissions;
- registration is an explicit orchestration use case, not permission for Auth
  to absorb the Users aggregate.

The final design may retain one physical database transaction, but the
transaction must be implemented behind explicit ports and wired at the
composition root. Shared persistence is not shared ownership.

Recommended model: `gpt-6.1-sol` xhigh.

## Cross-module service coupling

Production imports form the following graph:

```text
Achievements      → UsersModule / UsersService
Community Points  → UsersModule / UsersService
Reputation        → UsersModule / UsersService / UserBlockService
Levels            → UsersModule / UsersService
Levels            → CommunityPointsModule / CommunityPointsService
Auth              → UsersModule / UsersRepository / UserMapper
```

The first four dependencies exist mainly to validate user eligibility, obtain
account metadata or read another balance. Importing a broad service gives the
consumer access to unrelated behavior and makes ownership enforcement social
rather than structural.

Preferred replacements, selected per use case:

- consumer-owned narrow ports implemented by adapters at composition time;
- immutable local projections built from versioned events;
- command/event workflows for non-immediate side effects;
- dedicated read capabilities that return allow-listed data only.

Do not move these services into `shared`. That would hide coupling rather than
remove it. Do not create one universal `UsersFacade`; it would preserve the
same broad dependency under a new name.

## Prisma leakage inventory

Seventeen production feature files outside `infrastructure` import Prisma
types or inject `PrismaService`:

| Area                                  | Count | Leakage                                                 |
| ------------------------------------- | ----: | ------------------------------------------------------- |
| Auth application                      |     5 | Direct persistence plus `UserStatus`                    |
| IAM services                          |     3 | Direct persistence and Prisma query types               |
| Users domain/application/presentation |     6 | `UserStatus` in domain types, DTO, service and resolver |
| Reputation application                |     1 | Prisma `UserStatus`                                     |
| Content Access presentation           |     1 | Prisma enum in GraphQL contract                         |
| Editor presentation                   |     1 | Prisma enum in GraphQL model                            |

The core JWT strategy also reads Prisma-owned account state through session/user
relations. Cross-cutting core persistence services are not automatically
violations, but core Auth must not depend on feature-owned database shape.

Remediation requires module-owned enums/value objects and explicit mapper
translation at infrastructure boundaries. Renaming Prisma imports or re-exporting
them from a domain file is not isolation.

## Public API audit

Most module `index.ts` files export concrete application services. Examples
include Users, Community Points, Levels, Reputation, Achievements, Activity,
Editor, Interactions and News. Several use unrestricted `export *`.

This makes the module root syntactically public while exposing nearly every
operation semantically. A valid public boundary should export only:

- the Nest module when required for composition;
- stable capability tokens and narrow contracts;
- versioned event contracts intended for external consumers;
- deliberately public read models.

Concrete services, repositories, internal DTOs and infrastructure types should
remain private unless an ADR names them as a stable integration surface.

## Architecture checker coverage

The current checker detects only:

- domain imports of outer layer folders;
- presentation references to `PrismaService` or infrastructure repositories;
- imports of another module's `infrastructure` path.

It does not detect:

- deep imports into another module's domain/application folders;
- module-to-module concrete service injection;
- application-layer Prisma access;
- Prisma types in domain, DTO or GraphQL contracts;
- core-to-feature ownership leakage;
- broad or wildcard public exports;
- missing File Passports;
- forbidden dependency cycles;
- Passport paths that no longer match their files.

Therefore “Architecture boundaries are valid” currently means only that the
three implemented patterns were not found. It is not evidence that the approved
architecture is valid.

## Remediation order

### D2.1 — Freeze rules and vocabulary

1. reconcile conflicting architecture documents;
2. define module, capability, port, event, projection and composition-root
   meanings;
3. approve Auth/subject/Users/IAM/Authorization ownership;
4. approve synchronous versus asynchronous integration policy;
5. record decisions as ADRs.

### D2.2 — Add report-only enforcement

1. detect application/domain/presentation Prisma imports;
2. detect deep cross-module imports;
3. inventory concrete service exports and imports;
4. detect dependency cycles;
5. freeze an explicit baseline without pretending it is compliant.

### D3 — Repair identity and access boundaries

1. introduce module-owned contracts;
2. move Auth/IAM persistence behind adapters;
3. remove Users repository/mapper knowledge from Auth;
4. translate Prisma state at infrastructure boundaries;
5. preserve external login/session behavior with security regression tests.

### D4 — Repair gamification dependencies

1. replace broad Users dependencies with eligibility/block/read capabilities or
   projections;
2. replace Levels-to-CommunityPoints service access with a balance capability
   or projection;
3. narrow public exports;
4. turn approved rules into changed-file enforcement, then remove the baseline.

## Acceptance criteria

- Auth has no import from Users internals and no Users aggregate knowledge;
- feature application services do not inject Prisma;
- domain/application/presentation do not expose Prisma representations;
- no feature module injects another module's broad service;
- public APIs expose only approved narrow contracts;
- architecture checks fail on representative forbidden fixtures;
- dependency graph is cycle-free;
- affected unit, integration, E2E, migration and security tests pass;
- Passports and ADRs describe the resulting ownership truthfully.
