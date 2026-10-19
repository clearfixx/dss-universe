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
