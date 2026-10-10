# ADR-004 — Explicit module integration contracts

Date: 2026-10-10. Status: D2 design for D3/D4 review; no runtime refactor yet.
Builds on [architecture rules](../ARCHITECTURE_RULES.md),
[subject ownership](003-subject-and-access-ownership.md) and accepted
[transactional Outbox ADR](../../adr/ADR-0003-events-outbox-jobs.md).

## Decision

Keep the existing NestJS modular monolith, BullMQ/Outbox and PostgreSQL stack.
Do not introduce a platform migration or generic integration framework.
Modules own their use cases, domain, persistence adapters and transport mappings.
Shared technical packages (`storage`, `jobs`, `editor`) do not become a backdoor
for user/profile/security business ownership.

### Public APIs and composition

- Export/import explicit named symbols only; no `export *`, namespace re-export
  or namespace import. External package interop exceptions require a narrow,
  reviewed adapter, not a blanket exemption.
- Public contracts expose small immutable values, named commands, versioned
  events or capabilities. Prisma/Nest request objects, repositories and broad
  concrete services/mappers are not public business APIs.
- A consumer owns the port it needs; a composition adapter translates to an
  explicitly published provider contract. Do not replace `UsersService` with
  a universal `UsersFacade` exposing the same implementation.
- Feature applications do not import foreign internals. The composition root
  wires provider modules and adapters, using exported contract tokens/types.
  Direct sibling `*.module.ts` imports are a bounded legacy wiring convention,
  not permission to inject its services or read its repositories.
- New multi-owner orchestration is located outside the participating feature
  applications (for example an explicitly named API composition use case).
  Each operation stays owned; no catch-all shared business service is introduced.
- DTOs describe transport data only. Map at the owner's presentation boundary;
  create combined response models in presentation composition.

### Synchronous versus asynchronous work

| Flow                                                      | Contract                                         | Why                                                        |
| --------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------- |
| Login/session validation, revocation, account eligibility | Synchronous authoritative Auth port              | A stale allow decision is unsafe                           |
| Effective permission/Guardian/protected-content gate      | Synchronous Authorization capability             | Deny/disable/expiry must take precedence immediately       |
| Registration identity/profile creation                    | Coordinated command with owned unit of work      | Do not issue sessions for partially created state          |
| Notifications, Activity, points, indexing, analytics      | Versioned Outbox event and durable job           | Secondary effects must not corrupt the primary transaction |
| Display-only public summaries                             | Allowlisted projection with documented freshness | Presentation may tolerate bounded eventual consistency     |

Synchronous does not mean direct foreign Prisma calls. Use narrow application
contracts and explicit transaction boundaries. Keep existing permitted operations
working during adapter migration; do not move a security decision to a queue.

Persist cross-module events with the source transaction through the existing
Outbox; do not publish before commit or promise durability from in-process emit.
Consumers define deduplication/processed markers, retry/backoff, ordering/version
handling and poison/dead-letter visibility. Side effects must be idempotent, with
transactional markers where required. Schema changes require compatibility or a
new version. Contract metadata includes identity, version, correlation/causation;
payloads contain only needed non-secret IDs/facts, not raw ORM rows or documents.

### Projections, privacy and future providers

Every projection declares its source owner, freshness, rebuild/idempotency and
deletion/retention policy. Private profile data, protected document bodies, secrets
and storage credentials must not leak into generic activity/search/job payloads.
Delivery-time authorization remains authoritative when visibility changes; stale
public caches/indexes need explicit invalidation/removal. Projection lag cannot
grant access or bypass sanctions. A permission denial may be cached only with a
reviewed invalidation/failure contract, never as an unbounded positive grant.

News search remains News-local. Future shared Search consumes safe, versioned
content projections and must honor visibility/revocation; D2 does not implement it.
Media owns binaries/provider IO; content modules own lifecycle and access policy.
LOCAL remains operational; S3/MinIO provider parity is not claimed. Current key
checks are lexical, not protection against hostile symlink/junction writers
([DEBT-037](../../development/DEBT_REGISTER.md)); physical containment remains an
explicit threat-model decision, not silently solved by these contracts.

## Enforcement and migration

The [D2 tooling inventory](../ARCHITECTURE_TOOLING.md) is report-only, not a waiver
and not a full architecture proof. D3 closes Auth/IAM boundary findings first;
D4 closes the remaining foreign services, persistence leaks and public exports.
Changing an API export alone does not close a dependency: adapters and consumers
must be characterized and migrated together. Promotion to blocking enforcement
requires reviewed rule precision and tests; do not grow a baseline to conceal
new violations. No production source, schema or UI changes are part of D2.
