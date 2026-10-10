# D2 — Architecture contracts and report-only inventory

Date: 2026-10-10. Branch: `debt/d2-architecture-contracts`.
Base: `debt/d1-canonical-documentation`, commit `c6eb539` (stacked, not merged).
Status: implemented and locally verified; PR/CI/owner acceptance remain separate.

## Outcomes

- Owner explicitly approved Auth's opaque subject/credentials/account-eligibility
  boundary, Users profile ownership and separate registration/response composition.
  [ADR-003](../architecture/adr/003-subject-and-access-ownership.md) preserves current
  external responses and permits the shared database without new D2 tables.
- [ADR-004](../architecture/adr/004-module-integration-contracts.md) describes narrow
  public contracts, synchronous security decisions, Outbox secondary effects and
  privacy-limited projections. This integration design remains reviewable; the
  existing NestJS/BullMQ/PostgreSQL stack is retained.
- Historical Auth/RBAC ADRs are explicitly superseded for ownership/permissions;
  current rules no longer imply that a root barrel legitimizes broad services.
- Generic groups/Premium are not invented in Auth/Knowledge Forge. D3.5 is scheduled
  for a separate scope approval after D3; implementation is not yet authorized.
- A TypeScript AST inventory exposes 156 diagnostics: 83 wildcard exports,
  2 namespace imports, 17 concrete public exports, 18 foreign concrete dependencies,
  16 foreign private imports and 20 feature persistence leaks. These are overlapping
  rule diagnostics, not independent vulnerabilities. Work allocation: D3 20 / D4 136.
- A frozen JSON baseline and read-only drift check make added/removed identities
  visible. Report-only success and baseline match do not waive debt or certify
  compliance. No cycles are found in this bounded static feature graph only.
- [Tooling documentation](../architecture/ARCHITECTURE_TOOLING.md) states analysis
  gaps, including runtime DI, core JWT persistence, transitive/default exports,
  secrets, event idempotency, physical storage containment and Passport enforcement.

## Verification

- 28 architecture tests pass: forbidden imports/exports, import type/dynamic/require,
  allowed owned adapters/composition, alias/path normalization, parse gaps, SCCs,
  stable IDs, added/removed baseline drift and CLI argument rejection.
- `architecture:baseline` matches all 156 existing diagnostics; this is inventory
  stability, not an architecture pass. Legacy blocking subset and Editor license
  checks pass; `architecture:check` now also runs fixtures and the report.
- All changed files pass Prettier; 38 local Markdown links resolve without missing
  targets. Whole-repository format check remains red on
  41 pre-existing files (43 before D2; two touched historical ADRs formatted).
- API unit: 308 pass / 3 skipped, 72 passing suites; Worker: 36 pass; storage: 43
  pass; Web: 59 pass; Editor: 9 pass. Actual executions, not test cache replay.
  A first storage invocation duplicated its existing maxWorkers argument and was
  rejected by the CLI before tests; corrected invocation passes all 43.
- Lint: 9/9 tasks, all cached. Typecheck: 9/9 tasks, all cached. These existing
  workspace checks do not lint/typecheck root MJS tooling; Node syntax checks and
  fresh fixtures cover the added MJS files.
- Prisma validation passes. Fresh production build (`turbo build --force
--concurrency=2`): 6/6 tasks, zero cached, including API, Worker and Web.
- No app/package source, schema, migration, dependency, lockfile or CI workflow
  changes. No migration/seed, new full API/Web E2E, GraphQL or coverage acceptance
  is claimed. Full quality/release readiness remains D6/D7.

## Remaining gates

D3 implements the approved boundary with characterization/security tests; D4
migrates remaining dependencies and promotes precise architecture rules to blocking
enforcement. Baseline growth requires explicit review, never automatic regeneration.
DEBT-024 groups/Premium remains unimplemented; DEBT-037 physical containment remains
an owner threat-model decision. Existing format, E2E and dependency-audit debt are
not suppressed by D2. Phase 11 remains unstarted pending D7 and its brainstorm.
