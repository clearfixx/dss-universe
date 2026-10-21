# D4.4 — Private feature application services

2026-10-19, branch `debt/d4-private-feature-services`, parent `0a9218b` / draft
PR #48. Unaccepted review stack, not release baseline. Authorized D4.4 increment.

Current tracked API/Worker/package runtime scan found no references outside their
owners to CustomTitlesService, LeaderboardsService or the seven publicly exported
Interactions command services. Search is discovery, not proof against dynamic
consumers; full typecheck/build/E2E still required. Web uses GraphQL, not these
TypeScript module roots. One News foundation E2E imported InteractionTargetsService
from the public root only for fixture setup; it now uses its internal test-only
path. No assertion or business behavior changed.

Remove all nine service barrel exports and matching Nest exports. Keep local
providers/resolvers unchanged. Interactions still exports COMMENT_COUNT_READER
and INTERACTION_POLICY_REGISTRATIONS; Custom Titles/Leaderboards export no Nest
application provider. All existing named input ports, projection types and
infrastructure-only entries are unchanged. No new wrapper for absent consumers,
new permissions, schema, migration, event version, isolation or UI.

Nine regressions verify each root uses named non-application exports, exact Nest
tokens, and private service providers retained. Before correction **3 PASS/6 FAIL**;
afterward **9/9 PASS**. They pin source/metadata, not live HTTP correctness.
Exactly nine manually reviewed concrete-public-export entries removed from frozen
inventory, **81 → 72**, zero additions. No automatic regeneration/waiver; wildcard
exports may still conceal other concrete services and full D4.4 is not complete.

New/touched authored sources have truthful File Passports; E2E assertion contract
is preserved. Full lint/types/build/Prisma/architecture, opt-in coverage, adjacent
tests, format/audit, serial disposable E2E, GraphQL, CI/review/owner acceptance
remain pending at this checkpoint. Known baseline red findings are not waived.
D4 owner-operation reconciliation/remaining surfaces/ORM/enforcement, D5–D7,
stack audit and Phase 11 brainstorm remain open. DEBT-066/067 not implemented.

Full pre-E2E checkpoint: initial typecheck exposed union-array inference in the
new test's arrayContaining assertion. Replaced it with explicit per-provider
membership checks, no cast/suppression or production change. Final opt-in API
coverage **1113/1113**, 150 suites, zero skips, normal exit 0 (55.304s). Final
root lint/types/build pass 9/9/6 tasks (37.063s/17.427s/21.416s); Prisma and
architecture/license checks pass. Editor23/Storage43/Worker46/Web59/patch14 pass.
Global format41 inherited files and dependency audit1 high/10 moderate remain red.

All other gate processes terminal before serial full E2E. Exact disposable5435
project/service/loopback/tmpfs verified, zero clients, recreated/empty public schema
verified, migrations applied/no seed; dev5433 and persistent5434 untouched. E2E
running, GraphQL/CI/review/owner acceptance pending. No full-green claim.

## Final local gate evidence

Serial full E2E **501 PASS / 2 FAIL / 0 skipped of 503**, 48 suites, 388.468s.
Failures: News viewCount null/zero mismatch and Leaderboards foundation's expected
first user/currentLevel. The latter was not assumed inherited: reviewed failure,
fixture source, unchanged ranking SQL and read-only current disposable data.
Winning subject is a prior points-user fixture, older than leader-oldest, with
10 current-month points. SQL sorts equal points by account age then ID. This
matches the previously documented DEBT-045 cross-suite tie, not a new ranking
formula. No assertion, SQL, timeout or fixture isolation change; no rerun-to-green.

App26/26, Leaderboard ownership30/30, Content Boundaries9/9, interaction owner
policies18/18 and Custom Titles foundation1/1 pass in that same run. News fixture
now reaches its existing assertion through the internal setup import; it is not
made green by removing the broad service export. No HTTP schema/response change.

Completed Jest retained handles; after full JSON and verified zero DB clients/
api_boundary schemas, only exact owned PID21228 was stopped. This is not normal
green process termination. Read-only tie inspection emitted only two Booleans and
the scalar total, no user text/credentials. GraphQL generation succeeds; check
remains DEBT-044 red on generated barrel comment/newline. Own side effect restored
exactly; schema and generated outputs have no remaining Git diff.

Changed-file formatting/diff pass. Global format/audit, E2E/GraphQL and pending
CI/review/owner acceptance prevent full-green/closure claims. Runtime local
implementation is delivered separately from those still-open gates.
