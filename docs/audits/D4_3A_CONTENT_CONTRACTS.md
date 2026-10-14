# D4.3a — Editor and Content Access contracts

Date: 2026-10-13. Status: bounded implementation verified locally, review/CI
acceptance OPEN. Branch: `debt/d4-module-boundaries`; draft PR #10.
Review base for this increment: `093dd0c`; PR stack still depends on unaccepted
D3.5 PR #9. No merge or release acceptance is claimed.

## Outcome and ownership

Editor publishes named NEWS/COMMENT normalization operations, not its concrete
EditorService, delivery service or preview capability. News and Interactions own
separate normalization inputs. Root adapters pin the expected profile and select
the required fields. News receives document/plain/search text; comments also
receive canonical JSON. The owner retains size, JSON/schema and profile validation.

Content Access publishes a five-field verdict: gate ID, allowed, bypassed, unmet
requirement kinds and notice. The public decision reader strips the gate aggregate
(owner, thresholds, requirements and timestamps) and copies the unmet array.
Editor consumes its own decision input. Root composition explicitly translates
the six closed requirement kinds; there is no policy or default-allow fallback
inside the adapter. Existing Content Access GraphQL operations are unchanged;
the minimal contract constrains module integration, not a new HTTP privacy policy.

Editor no longer imports ContentAccessModule or its private service/types.
News and Interactions no longer import EditorModule or inject EditorService.
AppModule supplies explicit global input bindings through ContentIntegrationModule;
providers remain normal constructor-injected dependencies, not a service locator.
Owner services remain private to their own presentation and application assembly.

No API schema, public operation, database schema/migration, event, dependency,
frontend design, scoring rule, owner permission or Phase 11 workflow changes.
No interaction target write is split from its current transaction in this increment.

## Verified behavior

Nine new real AppModule E2E cases run against every actual migration in a uniquely
owned PostgreSQL test schema. They verify:

- Premium cannot bypass an absent `group:crew` audience; within that audience it
  bypasses only the numeric threshold. Audience and Premium revocation apply on
  the next request, without a stale cached decision.
- Published decisions contain exactly five allowed fields; guests receive redacted
  documents. Duplicate gates are evaluated once per request; denied subtrees are
  not traversed, even when they contain a missing nested gate.
- BANNED, DEACTIVATED and DELETED viewers receive no document payload. Missing
  gates and injected decision-provider failures return no successful projection.
- Existing News/comment GraphQL commands persist equivalent canonical documents;
  JSONB key ordering is compared structurally, not treated as a transport defect.
  COMMENT drafts persist through the same composed normalizer. Wrong profiles
  fail before article/comment writes.

The test uses the Premium group seeded by actual migrations and registers separate
subjects for state-changing Premium checks. It does not rely on another test's
membership state, external seeds, weakened audit triggers or a fake gate evaluator.
Only unused Shiki highlighting is replaced for Jest compatibility; provider-failure
injection is deliberate. The preexisting PostgreSQL gate-integration suite now
uses the real minimal reader/adapter and remains part of the full opt-in run.

Nine additional pure tests pin profile validation, exact minimal projections,
all six kind mappings, failure propagation and private Nest provider exports.
Existing News/comment/draft/redaction tests remain active. AST fixtures pin the
two named module roots without wildcard or concrete service exports.

## Verification

| Check                                 | Result                                                                |
| ------------------------------------- | --------------------------------------------------------------------- |
| Forced full opt-in units/integration  | PASS: API 639, Web 59, Worker 36                                      |
| Relevant full AppModule E2E           | PASS: 37 across six suites (including nine new content cases)         |
| Root coverage                         | PASS: API 547 pass / 92 opt-in skipped; Web 59, Worker 36, Storage 43 |
| Root lint/typecheck/production build  | PASS; API fresh, five unchanged builds cached                         |
| Prisma validation / migration status  | PASS: 53 current migrations, no migration changes                     |
| Architecture/license/baseline         | PASS: 38 fixtures; 118 → 103, zero additions                          |
| Changed-file format / diff whitespace | Checked before commit                                                 |
| Global formatting                     | RED: same 41 unchanged legacy files, DEBT-022                         |
| Generated GraphQL consistency         | RED: existing DEBT-044 barrel comment only; API schema unchanged      |
| Dependency audit                      | RED: existing 1 high / 10 moderate, no dependency changes             |
| Dependency security patch regressions | PASS: 14                                                              |
| Full E2E / final-head CI / review     | OPEN; no inherited blocker waived                                     |

The 92 opt-in cases skipped in the coverage command pass in the separate full
DB/Redis unit/integration run. No broad full-API-E2E success is inferred from the
six passing focused suites. A query confirms no `api_boundary_*` schema remains
after tests. Dev/production databases and frontend are untouched. The only owned
codegen side effect (an added lint comment in the originally clean generated Web
barrel) is restored; no generated business logic is edited.

At the prior `093dd0c` CI snapshot, Windows/Linux storage checks pass; dependency
audit and Web smoke fail; the main job remains live in API E2E after passing
architecture, migrations, lint, types and coverage. This does not establish the
status of the next pushed head or cancel/restart that live run.

## Reviewed inventory and remaining work

Exactly fifteen reviewed findings are removed: four foreign concrete-service
dependencies, five foreign-private imports and six wildcard exports. No new
baseline entry or exemption is added. This bounded syntactic reduction is not
proof that all ownership violations are closed.

D4.3 still requires interaction policy registration and atomic target lifecycle,
News/Media integration and activity contracts. D4.4 requires remaining explicit
public surfaces and non-infrastructure Prisma isolation; D4.5 requires enforcement,
cycles and final acceptance. D5–D7 remain open. Stop before Phase 11 for its
mandatory brainstorm. No new out-of-scope defect was found in this increment.
