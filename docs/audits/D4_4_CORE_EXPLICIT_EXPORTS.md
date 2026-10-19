# D4.4 — Explicit Core technical exports

2026-10-19. Branch `debt/d4-core-explicit-exports`, parent `4b0c8c4` / draft PR #53.
Authorized bounded D4.4 surface cleanup; not full D4 or Phase11 acceptance.

## Source review and invariants

Read all ten Core entries in the remaining36-finding inventory and declarations
behind their re-exports. Audit, configuration, database/errors/pagination, events,
GraphQL, observability and queue retain their existing reviewed exported names.
Use explicit value/type exports; do not invent a new technical facade or expand
feature business permission to use ORM services. Existing technical infrastructure
contracts remain subject to the same architecture rules.

The root `apps/api/src/core/index.ts` is an unused catch-all aggregator. The
tracked-source literal import/export/import-type/dynamic/require/require.resolve
scanner, with current @api alias and relative path/index normalization, finds zero
consumers. Delete only that9-wildcard entry; keep its target modules. This is
recoverable from Git, not deletion of services or data. Computed/custom/external
loaders are not certified absent by the bounded scanner.

Replace the other27 wildcards in nine Core entries with their exact named value
and type exports. Preserve configurations array order: app/database/jwt/mail/
openai/redis. Do not modify namespace factories, configuration.module wiring,
Joi schema, environment values, module/provider registrations or initialization.
This package does not repair or certify legacy dependency cycles; D4.5 must review
the complete graph separately. Type-only target files contain no runtime behavior.

No application service implementation, persistence algorithm, permissions, API
schema, transaction, event/payload, queue retries, timeout, provider or UI changes.
Newly touched entry files have truthful minimal File Passports.

## Boundary evidence

Twelve additional architecture cases: Core aggregation-entry absence, zero literal
consumers, exact named exports for nine entries and original config registration
order. Existing Media literal-reference verification is retained. New cases before
correction2 PASS/10 FAIL (full suite97 PASS/10 FAIL); after correction full suite
**107/107 PASS**. No rule weakening, timeout change or skipped cases.

Exactly36 individually reviewed Core wildcard entries removed from frozen
baseline, **36 → 0**, no additions/regeneration. All previous baseline metadata
is retained. Zero findings means this bounded authored API import inventory is
empty; it does not prove full source-operation ownership, cycle freedom, all
workspace exports or release readiness. D4.3 reconciliation, D4.5 enforcement,
D5–D7, the separate stack audit and mandatory Phase11 brainstorm remain open.

Full source gates, API opt-in coverage and adjacent tests are running. Serial
disposable full E2E, GraphQL, CI/review/owner acceptance pending; existing global
format/audit and DEBT-044/045/059 are not waived. No full-green/closure claim.

## Pre-full-E2E verification

Full API opt-in coverage **1138/1138**, 155 suites, zero skips, 85.588 seconds,
normal exit0. Root lint/types/build pass9/9/6 tasks (41.212s/35.892s/27.551s).
Prisma validation, architecture/license and107 Node architecture cases pass.
Editor23/Storage43/Worker46/Web59/dependency-patch14 pass. Global format41
inherited files and dependency audit1 high/10 moderate remain red; neither is
waived or bundled into this mechanical export change.

All pre-E2E processes terminal. Verified exact disposable5435 Docker project,
service, sole loopback binding/tmpfs and zero clients, recreated only that service,
verified empty public schema and applied migrations without seed. Dev5433 and
persistent test5434 not reset. Serial full E2E running; GraphQL/CI/review/owner
acceptance remain pending. No full-green or release/debt-closure claim.
