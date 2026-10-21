# D5 — File responsibility audit (initial, incomplete)

Date: 2026-10-21. Baseline main851c93a, merged integration PR#74.
Branch: `debt/d5-file-responsibilities`, separate managed worktree. Primary main
remains available for owner testing. No runtime changes in this checkpoint.

## Agreed boundaries and approach

File Passport correction, migration, classification and checker work is entirely
excluded and deferred to the owner's future GPT-5.6 task. This audit reviews
actual executable responsibilities, not headers, file length or stylistic taste.
Use existing architecture and sibling file conventions. Split only confirmed
unrelated roles; preserve public APIs, GraphQL SDL, metadata, DI lifecycle,
permission checks, guest/auth semantics and transaction boundaries. No UI work.

Sequence: inventory candidates; read their actual source and sibling patterns;
characterize relevant behavior; make bounded role separations on this one phase
branch; verify lint/types/architecture/unit/DB/E2E/GraphQL/build; publish review
evidence. Do not declare D5 complete from an AST scan or open a PR per file.

## Static inventory, not semantic certification

TypeScript AST scans840 tracked API/Worker runtime sources, excluding tests and
declarations. Twelve candidates combine class decorator roles within one file:

- core/cache/redis.module.ts: lifecycle Injectable and Module;
- core/graphql/resolvers/system.resolver.ts: DTO and Resolver;
- ai-core/presentation/graphql/editor-ai.graphql.ts: DTO and Resolver;
- auth email-verification/password-recovery/two-factor resolvers: DTO and Resolver;
- interactions audience-engagement resolver: Injectable, DTO and Resolver;
- news news-delivery.graphql.ts: Injectable, DTO and Resolver;
- news news-editorial/news-pins/news-settings.graphql.ts: DTO and Resolver;
- users users.resolver.ts: Injectable and Resolver.

Paths above are relative to apps/api/src (feature names relative to modules/).
This detector cannot establish that the other828 files have one responsibility.
It does not inspect every function/helper, SQL mapping or side effect. All twelve
need source-level disposition; absence of a match is not architectural acceptance.

## First actual source reads

`core/cache/redis.module.ts` defines RedisLifecycleService and wires RedisModule.
The service connects the lazy Redis connection on init and quits on shutdown;
the module constructs/provides the connection and exports only REDIS_CONNECTION.
Proposed separation: private lifecycle service file; same provider wiring and
same public module surface. No timeout, retry or connection policy changes.

`modules/interactions/presentation/graphql/resolvers/audience-engagement.resolver.ts`
defines a share wire-enum, optional JWT guard, two inputs, two output models and
the resolver. `bookmarks.resolver.ts` already uses separate inputs/models in the
same feature. Proposed separation follows those existing directories and keeps
the exact enum/type names and optional-auth behavior. Do not replace or broaden
the guard policy during a file move; current News viewer security must remain.

`docs/architecture/coding-style.md` confirms one clear responsibility per file
and relative internal imports. These two actual reads confirm candidate roles,
not a new security finding or a completed remediation. Remaining candidates and
broader semantic review are pending. No File Passport cleanup is authorized.
