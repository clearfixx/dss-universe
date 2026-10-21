# D4.4 — Explicit AI Core assembly surface

2026-10-19. Branch `debt/d4-ai-core-explicit-surface`, parent `1627e66` / draft
PR #47, unaccepted stack. Authorized D4.4 increment, not new AI product scope.

Current API/Worker/package source-consumer search finds AppModule importing only
AiCoreModule from this root. Internal resolver/service/prompts use local paths;
Web uses generated GraphQL types/operations, not this TypeScript module root.
No foreign consumer needs inference commands, service or domain enum from it.

Replace three wildcard exports with named AiCoreModule only. Remove the concrete
EditorAiService Nest export; retain identical private providers, resolver and
AI_TEXT_PROVIDER binding. No new abstraction/port for an absent consumer. Update
truthful File Passports; preserve command behavior, permission, provider/model,
prompts, API/schema, publication policy and all UI. No external inference call.

Three boundary regressions: AST pins one named public export; Nest exports empty;
private provider list unchanged. Before correction 1 PASS/2 FAIL; afterward all
three pass and existing five AI tests pass (**8/8, three suites**). These tests
prove surface/wiring metadata, not live HTTP/provider correctness.

Exactly three reviewed wildcard findings removed manually from frozen baseline,
84 to **81**, zero additions. Baseline check matches; remaining findings are not
waived, and no automatic baseline regeneration was used. Concrete Nest export
removal is additional semantic evidence, not an extra counted AST removal.

Full gate is running; no completion/release claim. Targeted results cannot stand
in for full tests/build/E2E/generated/CI/review/owner acceptance. Known inherited
global format (41 files) and dependency audit (1 high/10 moderate) remain red.
D4 remaining operation reconciliation/explicit surfaces/ORM isolation/enforcement,
D5–D7, stack audit and Phase 11 brainstorm remain open.

Current full pre-E2E checkpoint: API opt-in coverage **1104/1104**, 149 suites,
zero skipped, normal exit 0 (80.426s). Root lint/typecheck pass nine tasks each
(42.176s/16.397s); production build six tasks (31.263s). Prisma and blocking
architecture/license/tests pass; report remains 81 known findings, not waiver.
Adjacent Editor/Storage/Worker/Web and dependency patch tests pass. Changed-file
Prettier/diff pass; global format/audit remain red as recorded above.

All gate processes terminal before full E2E start. Verified exact loopback5435
compose project/service/tmpfs binding, zero DB clients; recreated only that
disposable service, verified empty public schema, applied migrations without
seed. Dev5433 and persistent test5434 untouched. Full E2E is running separately;
GraphQL check waits until it is terminal. No final full-gate acceptance yet.

## Final local gate evidence

Serial full E2E: **502 PASS / 1 FAIL / 0 skipped of 503**, 48 suites,
386.619s. App suite passes 26/26, exercising actual AppModule startup/schema and
preview flow with the private AI wiring retained. No new live AI inference or
permission test is claimed. The sole failure is News foundation initialization:
Nest GraphQL FileSystemHelper cannot open schema.gql (UNKNOWN), existing
DEBT-059 recurrence. That case does not reach its normal assertions; therefore
the inherited DEBT-045 viewCount mismatch is not shown fixed by this run.

Jest exits normally with code 1 for the failure, without retained-handle message
or manual process termination. Afterward zero DB clients and api_boundary schemas
verified. No repeated E2E run, timeout/assertion change or host configuration edit.

GraphQL generation succeeds, but consistency check remains red for DEBT-044's
generated barrel comment/newline. Restored only that own generation side effect;
git diff confirms schema and generated outputs unchanged. Full format/audit and
E2E/GraphQL are not green; local implementation is not CI/review/owner acceptance.
Remaining D4/D5–D7/stack audit/Phase 11 gates are unchanged.
