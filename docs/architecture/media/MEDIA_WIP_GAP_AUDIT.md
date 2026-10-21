# DSS Media Platform — WIP Gap Audit

> Status: Resolved by Media v1 foundation package on 2026-07-18
>
> Audited: 2026-07-18
>
> Code state: historical audit; retained as the decision record that guided the first Media v1 migration

## Scope

Compared:

- uncommitted `apps/api/src/core/storage/**`;
- uncommitted `apps/api/src/modules/media/**`;
- uncommitted Prisma Media changes;
- `docs/architecture/DSS_MEDIA_PLATFORM.md`;
- frozen `DSS-Media-Platform-v1.md` source specification.

## Summary

The WIP demonstrates the correct high-level separation — Media owns meaning, Core Storage owns physical persistence — but its current model is only an early skeleton. It must not be treated as the approved Media v1 data model or upload pipeline.

No WIP source file was modified during this audit.

## Resolution

The blocking persistence and domain gaps identified here are now resolved by
the focused `add_media_platform_v1` migration and the aligned Media domain
contract. Upload transport, processing, delivery and Avatar remain subsequent
vertical packages; the original simplified `path/url` model was never migrated.

## What Aligns

- dedicated Media module exists;
- physical storage is behind an injected provider contract;
- local provider is isolated from feature modules;
- media metadata has a domain entity and repository contract;
- owner, checksum, dimensions and soft-delete timestamp are represented;
- avatar is documented as the first consumer;
- feature modules are told not to depend on concrete storage providers.

## Blocking Gaps

### Domain model

Current WIP has one `Media` record only. Frozen v1 requires:

- lifecycle status (`PENDING` through `DELETED`);
- `MediaVariant`;
- `MediaReference`;
- upload session or an explicitly simplified, safe equivalent;
- audit integration;
- `AUTHENTICATED` and `RESTRICTED` visibility;
- MinIO/S3-compatible provider identity;
- bucket/storage key separation;
- duration, alt, caption and extensible metadata where applicable.

### Storage contract

Current `save(buffer)` loads the whole object into process memory and returns a permanent `/uploads/...` URL. It lacks:

- streams or presigned upload flow;
- object metadata/head operation;
- signed read URL;
- move/copy/finalize semantics;
- provider error mapping;
- idempotency and conditional operations;
- private delivery;
- MinIO adapter;
- safe atomic write/finalize.

### Security

Current WIP has no:

- upload policy registry;
- magic-byte/MIME verification;
- size/dimension/decompression-bomb protection;
- filename normalization policy beyond path cleanup;
- authorization/ownership use cases;
- virus/quarantine hook;
- rate limits and quotas;
- restricted-media delivery enforcement.

The local path normalization should receive dedicated traversal and collision tests before use.

### Processing and lifecycle

Missing:

- outbox/job integration;
- Sharp processing pipeline;
- variants and optimization;
- retry/failure/quarantine states;
- orphan detection;
- replacement/old-avatar cleanup;
- retention and purge jobs;
- reference-aware deletion;
- restore workflow.

### API and consumers

Missing:

- upload initiation/completion API;
- GraphQL metadata API where useful;
- avatar upload/remove vertical slice;
- `User.avatarMediaId` / `coverMediaId` references;
- migration away from `avatarUrl` / `coverUrl`;
- Media Library;
- tests and API documentation.

## Model Decisions Required Before Phase 6 Code

1. Use `storageProvider`, `bucket` and opaque `storageKey`; do not expose physical paths as domain URLs.
2. Adopt the frozen lifecycle status enum.
3. Add `MediaVariant` and `MediaReference` in the first migration.
4. Decide whether direct API uploads are sufficient for 1.0 local development while keeping the contract compatible with presigned MinIO/S3 uploads.
5. Treat private/restricted access as authorization, never as an unguessable URL.
6. Store avatar/cover references by Media ID, not URL.
7. Make deletion reference-aware and asynchronous.
8. Make upload/processing events outbox-backed after the Phase 4 runtime foundation.

## Recommended Handling of Current WIP

Preserve it as a prototype until the user chooses one of these explicit actions:

- **rework in place** during Phase 6 after GraphQL/runtime foundations; or
- **discard and regenerate** the uncommitted skeleton from the frozen model.

Do not create a migration from the current simplified Prisma `Media` model. Doing so would turn a prototype into a compatibility constraint before the lifecycle is designed.

## Phase 6 Entry Gate

Media implementation may resume when:

- Phase 2 quality gate is active;
- Phase 3 API/application shell is established;
- Phase 4 events/outbox/jobs/audit foundation exists;
- Media schema and state machine are reviewed against the frozen specification;
- the WIP disposition is explicit;
- the avatar vertical slice has acceptance tests.
