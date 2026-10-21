# D4.3c — Owner policies and minimal content reads

Date: 2026-10-14. Status: implementation locally verified; review/final-head CI
acceptance OPEN. Branch: `debt/d4-module-boundaries`, draft PR #10.
Increment base: `8281815`; stack still depends on unaccepted D3.5 PR #9.
No merge, full D4 completion or release acceptance is claimed.

## Owner policy boundaries

Interactions publishes only registration/unregistration of minimal callbacks.
The private registry still owns dispatch and duplicate-kind enforcement. The
published request contains target ID, owner ID, actor ID and capability, never
the full target row, dates or content. Verdict fields are selected explicitly.
Stable wrapper identity preserves same-object registration, competing-owner
rejection and stale/unmatched unregistration without replacing another owner.
The concrete registry, private Comment policy and legacy policy type are removed
from the business root; the registry is no longer a Nest integration export.

News publishes a decision contract receiving article/target IDs and a closed
capability. Users publishes its separate Wall contract receiving post/target/viewer
IDs, not unused capability or target persistence records. Both private policies
lose foreign imports and registration hooks. Root composition binds the two fixed
target kinds, maps all five capabilities explicitly, selects verdict fields and
rejects unknown/prototype capability keys. A second-kind startup conflict removes
the first partial binding. Unbind/rebind keeps the same callback objects and does
not unregister the owned Comment policy.

Publication/flag, coordinate, block and profile-privacy rules remain owned and
unchanged. AST-printer comparisons match both policy bodies after only parameter
coordinate substitution/removal of unused inputs. Lifecycle restrictions still
precede owner callbacks; Comment routing still checks its parent target. Missing
policy and provider errors do not become successful allow responses.

## Media and Activity boundaries

Media now selects exactly owner ID, visibility and status, publishing only
`ownerId` (nullable for system files), `isPublic` and `isReady`. Storage coordinates,
filenames, checksums and metadata do not cross the contract. News consumes its own
read port through a root adapter; no foreign repository or enum is imported.
Preserve the distinction: drafts may attach owned or public files even if not ready;
review/publication requires both ready and public, including for MEMBERS articles
as before. This does not add cover validation, new ACL or stronger deletion policy.
Broad Media repository/upload providers are no longer Nest integration exports.

Activity exposes one actor-summary reader, not its general feed/visit service.
It delegates pagination/filtering to the same owned use case, then selects only
ID, actor ID, module, action, subject type/ID and a copied timestamp. No metadata,
visibility field or raw body enters Users. A separate root adapter implements the
Users-owned projection port; Users retains existence, profile and block checks
before reading it. Existing PUBLIC/MEMBERS and non-retracted filtering, pagination
and GraphQL ISO timestamps remain unchanged. Actor/private-profile policy is not
moved into Activity. The private service remains available to its own presentation;
Activity root exports are named only. News/Users no longer import sibling modules
for these capabilities.

No API/GraphQL schema, Prisma migration/model, dependency, scoring, frontend,
owner/Command Deck authority or Phase 11 feature changes. No primary transaction,
outbox schema or event ingestion/deduplication algorithm changes in this increment.

## Verification

| Check                                      | Result                                                                |
| ------------------------------------------ | --------------------------------------------------------------------- |
| Full serial scoped unit/integration        | PASS: API 685, Web 59, Worker 36; all API DB/Redis opt-ins enabled    |
| Relevant real AppModule E2E                | PASS: 84 across nine suites                                           |
| New owner policy E2E                       | PASS: 18                                                              |
| New Media/Activity read E2E                | PASS: 12                                                              |
| Root lint/typecheck                        | PASS; no rules disabled                                               |
| Full scoped coverage, serial               | PASS: API 593 pass / 92 opt-in skipped; Web 59, Worker 36, Storage 43 |
| Production build                           | PASS with `--concurrency=1`; API fresh, five unchanged builds cached  |
| Prisma validation / migration status       | PASS: 53 current migrations, no schema/migration change               |
| Architecture/license/baseline              | PASS: 47 fixtures; 99 → 89; zero additions/exemptions                 |
| Changed-file format / diff whitespace      | Checked before commit                                                 |
| Global formatting                          | RED: inherited 41 legacy files, DEBT-022                              |
| Generated consistency                      | RED: inherited DEBT-044 barrel lint comment only; schema unchanged    |
| Dependency audit / patch regression        | RED: 1 high / 10 moderate; 14 patch tests PASS                        |
| Full API/Web E2E, final-head CI and review | OPEN; focused/local passes do not waive them                          |

Three existing public/personalized Activity Feed E2E also pass in a separate run;
the test-only import now reaches the same owned private service. This does not
stand in for full API/Web E2E acceptance.

The 30 new E2E use actual AppModule providers and every real migration in separate
UUID-owned PostgreSQL schemas. They prove current registered decisions, all News
states and disabled flags, both block directions, owner privacy bypass, missing
and mismatched coordinates, lifecycle precedence, duplicate/unbind/rebind behavior,
parent Comment routing and fail-closed provider errors.

Media/read tests prove exact minimal fields (including null system ownership),
owned-private/foreign-public non-ready draft access, stricter editorial readiness,
a successful real submit transition, missing/foreign-private rejection before
writes, activity privacy short-circuit, filtering, retraction and timestamp format.
Media fixtures are DB metadata, not a claim of binary upload/provider verification.
Activity rows are owned fixtures; unchanged ingestion is covered by existing units,
not asserted from manual fixture insertion. Only unused Shiki highlighting is
replaced for Jest compatibility; no policy/read provider is faked into availability.

Forty-one new pure tests cover the policy/registration/read boundaries in addition
to retained tests. Exact projection tests include extra forbidden provider fields;
failure tests do not substitute empty successful projections. All heavy checks
are serial/bounded after the previous increment's allocation failures; test scope
and coverage thresholds are unchanged. No OS or heap settings are modified.

The owned generated-barrel comment side effect is restored; no frontend change is
committed. A DB query after E2E confirms zero `api_boundary_*` schemas remain.
No immutable-history trigger is disabled; dev/production databases are untouched.

## Remaining work and CI

Ten reviewed findings are removed: one concrete root export, three foreign concrete
service dependencies, four foreign-private Media imports and two Activity wildcard
exports. Counts are syntactic inventory, not security or full ownership acceptance.

Direct cross-owner SQL remains visible: Content Gates reads account status/age,
comment counts and Reputation totals; Profile Wall checks Media attachability.
D4.3d must migrate those facts through owned contracts and audit other cross-owner
query/projection joins. Do not claim full D4.3 from this import reduction. D4.4/D4.5
explicit surfaces, ORM isolation, cycle/enforcement/review plus D5–D7 remain required.
Stop before Phase 11 for its mandatory brainstorm.

At the preceding `8281815` snapshot, storage passes on Windows/Linux, audit and
Web smoke are red, and the main CI job is still authoritative IN_PROGRESS.
Do not mark it stopped from observation time alone or restart it. DEBT-050 records
the earlier head's Web scheduler error; no frontend correction or waiver is
included. New-head CI must be evaluated independently after publishing.
