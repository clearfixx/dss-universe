# D4.4 — Explicit News integration surface

2026-10-19, branch `debt/d4-news-explicit-surface`, parent `2fb682f` / draft PR #51.
Authorized bounded D4.4 cleanup; not Phase11 or an accepted release baseline.

## Consumer evidence and change

Read current News root, module assembly, all six wildcard-exported domain type
files and application export declarations. Tracked-app TypeScript import/export
AST scan identifies current News-root consumers. Runtime composition uses named
ports, projection types and NewsModule; no foreign runtime references to the nine
concrete services or six repository tokens were found by the bounded source scan.
That search is discovery, not a guarantee against dynamic/external consumers.

One foundation E2E imports six concrete services from the root only for fixture
setup. Change those imports to explicit owner-private file paths; assertions and
fixture behavior remain unchanged. Other test consumers already use private paths
or the reviewed named integration contracts.

Remove all15 root wildcard exports. Keep existing named integration contracts and
the seven data types directly required by root composition: NewsArticle,
CreateNewsDraft, SaveNewsDraft, ShortNewsQuery, ShortNewsNumberedQuery, ShortNewsItem
and NewsRatingVote. Legacy unused root re-exports of domain constants/types and
application-local input types are not preserved as accidental public APIs; their
definitions and owner-internal consumers stay unchanged. Forty exact public names
are pinned by a new global architecture fixture.

Nest exports retain only NEWS_SEARCH_INDEX_MAINTENANCE and
NEWS_INTERACTION_DECISIONS. Nine concrete services and six repository bindings
remain private registered providers; no wrapper, new capability or dependency is
introduced. Public exports are not a way to obtain the owner repository.

No business algorithm, permissions, GraphQL/REST schema, migration, event shape,
isolation, timeout, scheduling, scoring or UI changes. New/touched source passports
state the actual boundary and distinguish test-only private imports.

## Evidence checkpoint

Four new boundary regressions: named non-application exports, exact two Nest
tokens, all nine local services and six repository bindings retained. Before
correction **2 PASS / 2 FAIL**; after **4/4 PASS**. These are AST/metadata evidence,
not HTTP verification. Exactly15 reviewed News wildcard baseline entries removed,
**68 → 53**, zero additions/regeneration. Global exact-public-name regression is
added without relaxing any existing rule.

Full source gates, opt-in API coverage, adjacent tests and global format/audit are
running. Serial disposable full E2E, GraphQL check, CI/review/owner acceptance remain
pending. Existing DEBT-044/045/059 and global red gates are not waived. Full D4
operation reconciliation/enforcement, remaining53 wildcard findings, D5–D7,
separate stack audit and Phase11 brainstorm remain required.

## Pre-E2E gate evidence

Full opt-in API coverage **1138/1138**, 155 suites, zero skips, 77.282 seconds,
normal exit0. Root lint/types/build pass9/9/6 tasks (39.060s/33.608s/23.099s).
Prisma validation and architecture/license checks pass, including92 AST fixture
cases and exact40-name News public contract. Editor23/Storage43/Worker46/Web59/
dependency-patch14 pass. Global format41 inherited files and dependency audit
1 high/10 moderate remain red; neither is waived or bundled into this package.

All pre-E2E command processes terminal. Verified exact disposable5435 Docker
project/service, sole loopback binding/tmpfs and zero clients before recreation;
verified empty public schema, then applied migrations without seed. Dev5433 and
persistent test5434 not reset. Serial full E2E is running. GraphQL/CI/review/owner
acceptance remain pending; no full-green or debt closure is claimed.

## Final local gate and publication evidence

Draft PR #52 publishes source `786e0d4`, based on PR #51. Full serial E2E:
**507 PASS / 1 FAIL / 0 skipped of508**, 48 suites, 388.702 seconds. The only
failure is the unchanged News foundation expected null/actual0 viewCount assertion
(DEBT-045); the internal fixture import reaches exactly that existing assertion.
No DI/provider-export failure and no assertion, SQL, fixture or timeout change.

In that same run App26, Content Boundaries14, Content Target Transactions17,
News owned snapshot16, viewer redaction20, secondary audience21 and related
audience12 pass. Leaderboards foundation1/1 passes this time; an order-sensitive
shared-fixture defect is not considered fixed merely because this run passes.

Completed Jest retained handles. Full JSON, exact owned PID19092 command, zero
disposable DB clients and zero temporary api_boundary schemas verified before
stopping only that process. Original shell returns-1, not a normal green exit.
No forceExit, timeout increase or rerun-to-green.

Subsequent GraphQL generation succeeds; overall check remains DEBT-044 red for
generated barrel comment/newline. Inspected/restored only own generator effect;
schema and generated files have no remaining diff. Full schema SHA-256 remains
`C03170CB54027C557F662A5B9BF5F85CAFA2112B8623D3FCA360E8FA9C82FD2C`.
Changed-file format and diff checks pass, user stack-audit plan hash unchanged.

Source-head CI observed: containment Ubuntu/Windows pass, Web smoke/audit fail,
main quality gate still in progress. Documentation-head CI, review and owner
acceptance are not certified. Global format/audit, E2E, GraphQL and acceptance
remain red/open; PR stays draft/unmerged, full D4 and debt closure not claimed.
