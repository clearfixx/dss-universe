# D5 — File responsibility audit (initial, incomplete)

Date: 2026-10-21. Baseline main851c93a, merged integration PR#74.
Branch: `debt/d5-file-responsibilities`, separate managed worktree. Primary main
remains available for owner testing. Initial inventory was documentation-only;
the bounded implementation checkpoint below is not full D5 acceptance.

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

## Bounded implementation checkpoint — 2026-10-22

Redis lifecycle now lives in a feature-private service file. RedisModule still
provides the same connection and exports only REDIS_CONNECTION. Engagement wire
enum, input classes, output projections and optional JWT guard now live in their
corresponding presentation files; resolver methods and module wiring are unchanged.
Named imports are used; no public barrel, schema, migration or dependency changes
are part of this move.

Verified: 13 focused lifecycle/guard tests, scoped ESLint, API typecheck,
Prisma validation and architecture checks (140 tests, zero baseline findings).
The fresh worktree required Prisma generation with an explicit test URL and
workspace dependency builds before typecheck; the initial missing-artifact
failure was not treated as passing evidence. No database migration was run.

Also passed: 31 HTTP News engagement security regressions in a private migrated
schema on disposable port5435, API build, and regenerated SDL comparison. The SDL
remains byte-identical (SHA256
`C03170CB54027C557F662A5B9BF5F85CAFA2112B8623D3FCA360E8FA9C82FD2C`).
No generated GraphQL changes were accepted. Full phase gates and the remaining
source reviews remain open; these two separations do not complete D5.

## Security transport separation — 2026-10-22

Source review confirmed that SystemResolver mixed its API status model with query
handling, and the email verification, password recovery and two-factor resolvers
mixed inputs/result models with operation delegation. The extracted classes now
live in existing Core GraphQL types and Auth inputs/models directories. No public
barrel or cross-module capability was added. Repository-wide reference checks
found no source consumers of the former resolver-local input exports.

Names, field metadata, validation decorators, guards and service calls remain
unchanged. Eleven new focused input-validation cases pass, as do the 27 existing
AppModule HTTP scenarios, API lint/typecheck/build and all 140 architecture tests.
Regenerated SDL retains the same SHA256 recorded above. Full API unit/DB/Redis
verification passed naturally: 166 suites, 1249 tests, no skipped tests, 80.27s.
The logged IAM uniqueness errors belong to exercised negative scenarios, not
failed suites. Full D5 acceptance remains open.

Next candidates include AI editor transport and News delivery/editorial/settings/
pins, where shared wire enums must not keep DTOs dependent on resolver files.
Users also contains a local optional JWT guard. These are source-review leads,
not approval to alter authorization or a claim that their entire files have been
semantically audited. Six of the original twelve candidates have bounded moves;
that count is not a completion percentage for the broader responsibility audit.
