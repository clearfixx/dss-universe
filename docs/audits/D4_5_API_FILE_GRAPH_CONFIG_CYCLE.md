# D4.5 — API file graph and Core configuration cycle

Date: 2026-10-19. Branch: `debt/d4-file-graph-config-cycle`.
Status: implementation and focused verification; full gates/publication pending.
Parent: unaccepted draft PR #55. This is not Phase 11 work or full D4 acceptance.

## Ownership and behavior

The Core config barrel re-exported ConfigurationModule while that module read
the ordered `configs` from the same barrel. Both edges existed before PR #54.
The new `config-loaders.ts` owns the identical six namespace imports and array;
the module consumes it directly. The public barrel still explicitly exports the
same nine names. No namespace factory, Joi schema, environment precedence,
ConfigModule options, API, database schema or dependency has changed.

Order remains app, database, jwt, mail, openai, redis. Five focused API tests pin
factory identity, the complete registration options, Nest metadata, and one new
registration with the correct array for each initial import order (barrel/module).
Only framework registration is mocked; real AppModule startup remains E2E work.

## Permanent graph enforcement

The existing feature-layer rules retain their modules/Core/composition scope.
A separate pure analyzer now builds the local static file graph over all authored
API src TS/TSX, including health, shared and application-root sources. TypeScript
resolves relative and `@api` dependencies against supplied source files, using
the actual tsconfig compiler options through a virtual host, not an invented
extension resolver. Tests/declarations are excluded. Literal imports, exports,
import types, import-equals, require and dynamic imports contribute edges;
type-only cycles are intentionally included. Nonliteral loader calls and missing
local sources become explicit findings, rather than disappearing from the graph.

The CLI reads JSONC tsconfig options; invalid/unknown options fail, and extends
is explicitly rejected until inheritance resolution is implemented. Current API
tsconfig has no extends. External packages, other workspace aliases, computed
custom loaders, runtime DI and external filesystem/package metadata are not
certified by this graph. This is not whole-workspace or security acceptance.

The mandatory command and focused architecture script run both test files.
CLI text/JSON now distinguish `check-baseline` from diagnostic `report-only` mode;
neither mode claims overall architectural compliance.
Frozen findings remain empty: only the baseline scope description is updated;
no finding is waived, regenerated or added to the accepted inventory.

## Evidence and corrections during implementation

With the new CLI graph enabled before changing Core config, the real command
returns exit1 with exactly one file-cycle (module/barrel), baseline1 added/0 removed.
After the ownership correction it returns zero findings and exact baseline match.
Architecture137/137 initially pass, including21 file-graph/config-parser cases and
a new negative CLI cycle fixture. A further CLI mode-label regression is included
in the final verification. Existing exact public-name checks remain intact.
The ordered-loader characterization follows the moved array, not a new ordering.

Two initial focused checks fail before the fix: missing loader file and module
still importing its barrel. An earlier test draft first exposed a missing AST
predicate binding; that test defect was corrected before recording those two
meaningful failures. Initial API lint flags two unbound mock-method references;
they are corrected through typed descriptor reads without rule suppression.
The initial import-order tests incorrectly assumed a fresh Jest mock per isolated
module registry; 3 PASS/2 FAIL led to measuring exactly one additional call,
checking its array and shared mock identity. All five focused cases now pass.

An earlier full API coverage run passes1141/1141 (156 suites,119.165s), before the
two import-order cases/final test corrections. It is not final-source proof.
At that checkpoint final full unit coverage, formatting and E2E were pending.
Earlier root lint/types/Prisma/build and adjacent Editor23/Storage43/Worker46/
Web59/patch14 pass. Dependency audit is still red:1 high/10 moderate. The first
global format scan reports43 files, including two newly edited graph files;
those two are formatted before final verification, not described as inherited.
A read-only PowerShell diagnostic process exits with a CLR double-mapped-memory
error; no product root cause is inferred and no live test is restarted for it.

Final-source pre-E2E verification: architecture138/138; API opt-in DB/Redis
coverage1143/1143 across156 suites in53.321s, normal exit zero. Root lint/types/
Prisma/build pass after correcting the test defects above. Global format remains
red in41 inherited files after formatting the two own graph files. Five focused
config cases pass. All pre-gate sessions are terminal before full E2E begins.
E2E uses only the verified disposable Compose project/service on127.0.0.1:5435,
with tmpfs storage and zero clients before recreation; empty public schema before
migrations, no seed. Full E2E/GraphQL/external CI results remain pending.

## Remaining requirements

Record final-source gates, E2E, GraphQL drift, CI and review evidence before
acceptance. D4.3 exhaustive owner-operation reconciliation, remaining D4.5 review,
D5–D7, the separate stack audit and mandatory Phase 11 brainstorm remain open.
Known baseline defects are not fixed or closed by removing this cycle.
