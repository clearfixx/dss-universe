# DSS Universe — Engineering Debt Register

> Status: Active
>
> Updated: 2026-10-22

## Purpose

This document records defects and architectural debt discovered outside the
currently accepted implementation package. Entries are reviewed with the
project owner before implementation unless they are required to keep the
active package safe and buildable.

## Status model

- `OPEN` — confirmed and awaiting decision.
- `ACCEPTED` — approved for a named package.
- `DEFERRED` — intentionally postponed with an owner or target phase.
- `RESOLVED` — implemented and verified.
- `REJECTED` — reviewed and determined not to be debt.

## Register

### DEBT-074 — Social privacy owner assertion races asynchronous presence (Medium, ACCEPTED, separate D6 package)

On2026-10-22 GitHub run39768009772 at395c744 fails1/586 E2E assertions:
`following redacts each profile without changing total, ordering or page boundaries`.
The HTTP owner profile contains the seeded lastSeenAt2026-01-01, while a later
database read sees the current presence timestamp. UserPresenceInterceptor
starts touch without awaiting it before next.handle; the test incorrectly
assumes its later DB read is the exact response snapshot. This is confirmed
test synchronization debt, not evidence that the privacy projection leaks.
The failed run/log is retained, not rerun blindly or attributed to the API
production-entry correction.

Owner approved a separate package after DEBT-061: stabilize presence facts in
the test deterministically, retain exact privacy/owner/timestamp assertions,
and add a regression for the ordering. No runtime changes, sleeps, timeout
increase or broad timestamp matcher. Current Worker package only records this
finding; CI remains red until the separate correction and new verification.

The separate correction now controls only presence.touch in the privacy suite,
preserves exact seeded profile/timestamp comparisons, and adds a promise-gated
HTTP case proving a later actual DB write does not change the response snapshot.
Focused6/6 cases pass without sleep, timeout changes or runtime changes.
Full gates/remote acceptance remain open; see
[test synchronization evidence](../audits/DEBT_074_SOCIAL_PRIVACY_PRESENCE.md).

### DEBT-073 — Workspace quality does not execute requested DB/Redis opt-ins (Medium, ACCEPTED, separate D6 package)

Date: 2026-10-22. D5 worktree based on43d9562. With `DATABASE_URL` targeting
disposable5434, `REDIS_PORT=6380` and all four existing `RUN_*` opt-ins explicitly
set in the invoking shell, `pnpm quality` reports API14 skipped suites and
106 skipped tests (1175 passed /1281 total). Turbo uses its current strict
environment configuration; those opt-ins are not declared in turbo.json.
Direct API Jest runs in preceding checkpoints execute the opt-in scenarios.

This is a verification coverage gap, not a newly proven runtime security flaw.
A green aggregate command must not be described as all DB/Redis scenarios passing.
The current D5 package will gather separate uncached coverage with explicit env
passthrough, without changing runner or CI configuration. Proposed separate D6
correction: explicitly forward/hash relevant test configuration and enforce the
intended integration-test count/skip policy, with clean-checkout and CI evidence.
Owner approved the separate D6 package on2026-10-22: explicitly forward and hash
DB/Redis test env and verify mandatory opt-ins are not skipped. D5 does not change
the runner/CI; implementation, regressions and full D6 acceptance remain pending.

Implementation is now on the separate D6 branch: API-specific strict env/hash,
an uncached full profile and fail-closed Jest result policy. Focused controls and
the final local quality, coverage and same-database586/586 E2E runs pass.
Checkpointc10c937 in PR#79 also has all five remote checks green, coverage1281/1281
and downloaded E2E JSON586/586 without skips. Phase-level review/acceptance is
still open. See [current evidence](../audits/DEBT_073_FULL_TEST_ENV.md).

### DEBT-072 — Profile asset assignment races Media cleanup claim (Medium, ACCEPTED, separate pre-11 design/correction package)

Date: 2026-10-21. Base47cd877. Actual authenticated AppModule GraphQL and
fully migrated isolated PostgreSQL reproduce both avatar and cover assignment
committing after cleanup has claimed the same Media row as DELETING. The
assignment returns success and persists an active reference/profile binding;
public variant lookup denies the no-longer-READY asset. Actual DB cleanup
completion subsequently records DELETED while the active binding/reference
remain. This is lifecycle/data integrity inconsistency, not a demonstrated
cross-owner access leak or physical binary loss. No Storage IO runs in the test.

The existing assignment transaction rechecks READY/ownership/PUBLIC, and
Serializable cleanup rechecks absence of committed references/profile bindings.
They do not jointly serialize the demonstrated schedule: assignment pauses after
its readiness read, cleanup commits, then assignment resumes. Sequential controls
deny assignment after an already committed cleanup claim and exclude an already
committed binding from cleanup. Six real DB/HTTP characterization cases pass;
passing vulnerable-state assertions are not correction acceptance.

Owner approved a separate pre-11 package on2026-10-21: design shared
synchronization first, then atomic protection and deterministic DB/HTTP
regressions preserving API and Audit. At that audit snapshot the exact protocol
was not yet approved; the audit included no runtime correction. Existing
News draft attachment semantics must not be silently tightened. See
[root SQL audit and reproduction](../audits/D4_ROOT_OWNER_SQL_RECONCILIATION.md).

Separate design follow-up at5372db3: [DEBT072 protocol design](DEBT_072_PROFILE_CLEANUP_DESIGN.md)
compares lock-only versus a Media-owned conditional physical write that preserves
business fields/updatedAt. Real migrated SQL prototype against the current root
cleanup observes stale Serializable cleanup P2034; proposed known-conflict
handling rolls back/defer the whole batch to the next normal invocation, without
IO, new retries/isolation/timeouts or API changes. Assignment in this probe is
test-only, not a production provider or HTTP correction. On2026-10-21 the owner
explicitly approved this exact conditional write/P2034 defer design, including
physical write cost and contention-related cleanup delay. Focused24/24 pass;
runtime implementation remains a separate package. This does not close the debt
or waive inherited gates.

Design/probe final local evidence: API1206/1206, focused24/24 and full E2E562/563,
zero skipped, with protocol10/10 and original HTTP audit6/6 passing. Only inherited
DEBT045 fails; known retained Jest handles require verified PID-only cleanup.
Lint/types/Prisma/build/architecture140 and adjacent tests pass. Format41,
dependency audit2 high/12 moderate, GraphQL DEBT044 and CI/review remain open.
No runtime, API, schema or timeout change; the production race remains until the
separate approved implementation package is delivered and verified.

Runtime follow-up at406b874 on `debt/debt072-profile-cleanup-atomicity`:
Media-owned conditional write guard and known-P2034 whole-batch defer are locally
implemented with unchanged API/schema/isolation/timeouts/metadata. Red-before
unit6/7 and HTTP4/6 become unit19/19 and expanded actual DB/HTTP39/39, including
cleanup-first waits, actual Audit rollback and retention zero-delete/fresh progress.
Underlying P2034 remains observed, not mocked away; only physical Storage delete
is stubbed for safe IO observation. Read-only dev integrity check finds0 profile
joins to DELETING/DELETED; no data repair. Final API with explicit in-band coverage
passes1225/1225; an intervening unchanged Auth test/hook5000ms timeout and later
isolated14/14 are preserved, cause unproven. Full fresh E2E576/578, zero skips:
all39 target cases pass; existing News null/zero and Leaderboards shared-fixture
tie fail (DEBT045/069). Read-only current fixture evidence confirms the earlier
ACTIVE points-user and leader-oldest both have10 monthly points. Exact completed
Jest-only cleanup follows complete JSON and zero other clients/owned schemas;
shell exits1, not a normal green gate. Lint/types/Prisma/build/architecture140
and adjacent tests pass. Format41, audit2 high/12 moderate, DEBT044 consistency
and CI/review acceptance remain red/pending; debt is not closed. See
[runtime evidence](DEBT_072_PROFILE_CLEANUP_IMPLEMENTATION.md).

### DEBT-071 — Guest shared engagement bypasses MEMBERS News eligibility (Medium, ACCEPTED, separate pre-11 design/correction package)

Date: 2026-10-20. Base6eaf383. Actual AppModule GraphQL, real publication
workflow and fully migrated isolated PostgreSQL reproduce guests (also invalid
JWT and revoked sessions) being denied Full News but successfully writing views
and shares on MEMBERS articles, reading aggregate counts and persisting guest
rows. Guest view recording also succeeds on a comment target whose MEMBERS
parent is hidden by newsComments. No authored text, password/token leak or
account takeover is proven; known target UUID is required.

Cause: optional engagement actor absence becomes `anonymous`; root News binding
drops viewer context and owner policy checks status/flags without audience.
Direct delivery/secondary projections retain their corrected eligibility.
Additional deliberately corrupted publishedAt-null row shows availability
parity drift, not a normal-workflow exploit. PUBLIC/idempotency/member and
unpublished/disabled-sharing controls pass. Focused8/8, normal exit0,11.147s.

Separate proposed security package: explicit viewer context and current News
eligibility through narrow owner contracts before engagement effects/aggregate
reads; inherited comment READ, real guest/member/revocation/failure regressions.
Preserve PUBLIC guest analytics, flags, API, timeouts and bounded work; no new ACL
or silent Wall-policy changes. The owner approved a separate package with
viewer-context design first on2026-10-20; implementation is not in this audit.
Current packet is evidence-only. See
[source and HTTP evidence](../audits/D4_NEWS_INTERACTION_AUDIENCE.md).

Separate [viewer-context design](DEBT_071_NEWS_INTERACTION_VIEWER_PLAN.md)
at4683f1f proposes explicit guest/authenticated context through Interactions,
root projection of only authentication state to News, and current publication/
audience checks before engagement persistence. On2026-10-20 the owner approved
the isolated legacy Wall bridge and retained precheck/write transaction boundary;
no atomic revocation guarantee or Wall security certification is claimed. The
design packet changes documentation only; runtime correction remains unimplemented.

2026-10-21 runtime follow-up: the separately approved correction is now locally
implemented on `debt/debt071-news-interaction-eligibility`. Required explicit
viewer context reaches the News-owned publication/audience policy before any
engagement repository call; root sends News no identity/profile/session fields.
The isolated legacy Wall bridge and current precheck/write split are preserved.
Red-before3/8 and sequential final focused72/72 establish actual migrated HTTP
regressions, including31 News security cases and query-work bounds. API
coverage1206/1206, workspace lint/types/Prisma/build and architecture140 pass.
Full E2E546/547, zero skipped, with security31/31, owner20/20 and App27/27 passing;
only DEBT-045 fails. Exact completed-Jest cleanup follows zero DB clients/schemas;
reported exit1 is not a normal green run. CI/review acceptance remains pending;
format/audit/GraphQL and retained-handle debt are not waived. See
[runtime evidence](DEBT_071_NEWS_INTERACTION_VIEWER_IMPLEMENTATION.md).
The audit/design paragraphs above describe their historical baselines, not an
assertion that the original bypass remains unchanged in this runtime branch.

### DEBT-070 — Social-list projection returns private profile fields (High, ACCEPTED, separate pre-11 security package)

Date: 2026-10-20. Real GraphQL with three synthetic Auth-registered users in a
fully migrated isolated schema proves an authenticated outsider receives a
PRIVATE user's bio, hidden location and interests through `followers` of a
public profile. The same viewer's `userByUsername` response correctly returns
null/null/empty for those fields. No successful authorization decision is mocked.

At audit baseline `eec1983`, social graph list reads edge IDs then `UsersService.getManyByIds`, which
maps unredacted display records; direct public profile reads instead apply
viewer privacy. The GraphQL mapper copies the returned fields. Following and
blocked-user lists share that projection path but are not yet independently
proven by this fixture. No password/token disclosure or account takeover is
claimed. The passing characterization deliberately pins a defect, not safety.

Requested separate pre-11 security package: viewer-safe per-profile projection
for social lists; cover followers/following/blockedUsers, owner and third-party
viewers, PUBLIC/MEMBERS/PRIVATE and field flags, with preserved total/order/
pagination and no API or transaction-budget change. Policy and implementation
details still require source-aware design; the owner approved the separate
security package on 2026-10-20. This audit changes no runtime behavior. Evidence:
`apps/api/test/users-social-privacy-characterization.e2e-spec.ts`, focused1/1
PASS with normal exit0 on 2026-10-20. Do not declare the privacy contract safe
from the older shared-row field allowlists or green static inventory.

Separate correction now locally implemented on `debt/debt070-social-profile-privacy`:
all three lists use a required-viewer batch projection, sharing direct-profile
policy and preserving edge paging/count/order. Privacy failure has no raw-data
fallback. The former passing defect assertion is now a red-before/green-after
security regression, extended with migrated HTTP paging/owner/revocation/error
and actual bounded SQL checks. Focused5/5, API1175/1175 and final lint/types/
Prisma/build/architecture pass. Full migrated E2E513/514, zero skipped,
including security5/5 and App27/27; only inherited DEBT-045 fails. Retained
handles require exact completed-process cleanup, not green shell exit.
GraphQL DEBT-044 and global format/audit remain red; CI/review acceptance is
pending, with no waiver. See
[correction evidence](DEBT_070_SOCIAL_PROFILE_PRIVACY.md). Historical audit text
above describes the pre-correction state, not a continuing claim of current leak.

2026-10-20 bounded Notifications surface progress for DEBT-027: the unused
concrete preferences-service Nest export is removed; local service/resolver/
repository remain private. Metadata regression red before/green after; API1169,
architecture140, workspace lint/types/Prisma/build and adjacent tests pass.
Migrated E2E508/509, no skips, App27 and two preferences atomicity cases pass;
only DEBT-045 fails. Format41/audit1 high10 moderate, DEBT-044 consistency and
retained handles remain open; CI/review acceptance pending. See
[evidence](../audits/D4_NOTIFICATIONS_PRIVATE_SURFACE.md). No delivery features,
facade, schema/API or frontend changes; full D4 remains open.

2026-10-20 separate Media/Users runtime ownership progress for DEBT-027:
Users owns only the profile-binding absence predicate; Media retains the fixed
library/metrics/cleanup algorithms; root preserves the Serializable cleanup
transaction and Audit. API1168/1168, architecture140/140, workspace lint/types,
Prisma/build and adjacent suites pass. Fresh migrated E2E506/509, no skips,
App27/27 and Media2/2: only inherited News viewCount/search-budget failures.
Retained Jest cleanup is not normal green exit. Format41/audit1 high10 moderate,
DEBT-044 consistency and CI/review remain open. See
[runtime evidence](../audits/D4_MEDIA_PROFILE_ASSET_RUNTIME.md). No API/schema/
permission change, frontend work or full D4 closure is claimed.

2026-10-20 Media/Users foundation for DEBT-027: draft PR #61 contains design,
three query-shape tests and five isolated PostgreSQL characterization cases.
Final API coverage1165/1165 (158 suites, no skips), architecture/lint/types/
Prisma/build pass. No production code/schema changes; owner approved a separate
runtime transfer only after foundation verification. Global coverage is mapped
in [the reconciliation](../audits/D4_COVERAGE_GAP_RECONCILIATION.md), not inferred
from a zero static inventory. Full E2E/review/CI remain pending; format41 and
dependency audit1 high10 moderate stay red. See
[foundation evidence](../audits/D4_MEDIA_PROFILE_ASSET_FOUNDATION.md).

2026-10-19 IAM persistence-family progress for DEBT-027: all fourteen current
owned repository/fragment sources and caller/root boundaries are reconciled;
the now-unused registration-role policy root export is removed, with its owned
value/writer preserved. API1157 and architecture139 pass; full local gate/CI
acceptance follows in [the report](../audits/D4_IAM_OPERATION_RECONCILIATION.md).
DEBT-047 remains open; this is not new owner-policy implementation or full D4 closure.

2026-10-19 bounded Auth lifecycle review adds DEBT-068, reproduced with actual
credential/email-verification adapters in isolated PostgreSQL. Six focused DB
cases pass, including the defect characterization; no runtime correction is
included. Owner approved a separate security package before Phase 11.
[Operation evidence](../audits/D4_AUTH_LIFECYCLE_OPERATION_REVIEW.md).

2026-10-19 bounded registration progress for DEBT-027: Auth and Users now own
allowlisted enrollment fragments; IAM owns baseline-role lookup/assignment.
Root retains the single shared-row INSERT and default transaction, unchanged
operation order, API and post-commit issuance/delivery. API coverage passes
1,147 tests without skips; E2E completed 507/508 (only inherited News null/zero
failure), with all 26 App cases passing. Generated consistency remains red on
DEBT-044; format/audit and retained handles remain open. Packet acceptance,
full D4 reconciliation and D5–D7 are not closed. See
[bounded evidence](../audits/D4_REGISTRATION_OWNED_PERSISTENCE.md).

2026-10-19 D4.5 API file-graph/Core config progress for DEBT-027: unchanged ordered
loaders move into an owned file, removing the inherited module/barrel cycle while
retaining all nine public exports/options. TypeScript-resolved local file graph
now covers all authored API src, with missing/nonliteral edges explicit; existing
feature-layer rules retain their scope. Baseline findings stay empty, no waiver.
Architecture138/138 and final API1143/1143 pass; five config cases include both
initial import orders. Root/sibling gates pass except format41/audit1 high10 moderate.
Full E2E507/508,0 skipped,402.136s: only unchanged DEBT-045 News null/zero. App26
passes, but DEBT-048 is not closed by one non-reproduction. Completed own Jest
PID20704 stopped after full JSON and zero clients/schemas; no normal-green claim.
GraphQL generation passes, DEBT-044 drift red, own generated drift restored; SDL
unchanged. Actual-host graph815 sources/2104 edges has no local unresolved edges
or cycles, not full ownership/runtime/security proof. See
[evidence](../audits/D4_5_API_FILE_GRAPH_CONFIG_CYCLE.md).
Draft PR #56 published on unaccepted PR #55; new-head checks not yet reported.
Full D4, CI/review, D5–D7, stack audit and Phase11 brainstorm remain open.

2026-10-19 bounded D4.5 enforcement progress for DEBT-027: mandatory architecture
command now checks the frozen inventory; standalone reporting remains diagnostic.
Seven new regressions cover command/CI wiring, current CLI and temporary-tree
negative/report paths; full architecture114/114. API1138/1138 and root/sibling
checks pass except inherited global format41/audit1 high10 moderate. Full E2E
506 PASS/2 FAIL of508 in612.114s: DEBT-045 News null/zero and DEBT-048 App5000ms.
Completed owned Jest PID9016 retained handles and was stopped after full JSON,
zero clients/schemas; no normal-green exit claim. GraphQL generation succeeds,
DEBT-044 drift remains red; own generated drift restored, SDL hash unchanged.
A separate read-only file-graph probe confirms inherited Core config module/barrel
cycle outside the bounded feature-cycle inventory. See
[evidence and remaining scope](../audits/D4_5_BLOCKING_ARCHITECTURE_GATE.md).
Published as draft PR #55 on unaccepted PR #54. Initial CI in progress;
no D4/quality/debt closure, merge or acceptance is claimed.

2026-10-19 Core D4.4 progress for DEBT-027: unused9-wildcard root aggregator removed
after zero literal-consumer scan; other27 Core wildcards replaced with exact named
technical exports in nine entries. Config namespace order, wiring and all runtime
implementations unchanged. Twelve new cases2 PASS/10 FAIL before, full architecture
107/107 after. Baseline36 →0, no additions; this is bounded import inventory only,
not D4/cycle/security acceptance. Full gates, D4.3/D4.5 and D5–D7 remain pending.
[Core export evidence](../audits/D4_4_CORE_EXPLICIT_EXPORTS.md).

Final Core exports PR #54 local evidence: API1138/1138, architecture107/107,
root/sibling gates pass except inherited global format/audit. Full E2E506 PASS/
2 FAIL of508,0 skips: News null/zero DEBT-045 and unchanged App GraphQL registration
5000ms scenario matching DEBT-048; root cause not established. Core Outbox/Audit11,
Audit2, Outbox2, Content Boundaries14, Media2 and ownership30 pass; App25/26.
Completed exact Jest PID12720 stopped after full JSON and zero clients/schemas.
GraphQL generation passes, DEBT-044 drift check red; own drift restored, full SDL
hash unchanged. Source-head containment CI pass, Web smoke/audit fail, main pending.
Bounded inventory0 is not full D4/ownership/cycle/quality acceptance; no closure.

2026-10-19 bounded D4.4 unused Media domain entry cleanup for DEBT-027: tracked
literal import/export/dynamic/require/import-type scan finds zero consumers after
alias resolution. Delete only its17-wildcard barrel; all owned targets and runtime
providers unchanged. Three new cases2 PASS/1 FAIL before and3/3 after, full
architecture95/95. Baseline53 →36, zero additions. Full gates/CI/acceptance pending;
computed/external consumers not certified absent by source scan.
[Media entry evidence](../audits/D4_4_UNUSED_MEDIA_DOMAIN_ENTRY.md).

Final Media-entry PR #53 local gate: API1138/1138, root/sibling/architecture95 pass.
Full E2E507 PASS/1 FAIL of508,0 skipped, only unchanged News null/zero DEBT-045.
Media platform2/profile-assets8/Content Boundaries14/App26 pass; no missing-entry/
provider regression observed. Completed exact Jest PID20092 stopped after full
JSON and zero clients/temporary schemas. GraphQL generation passes, DEBT-044 drift
check red; own drift restored and full SDL hash unchanged. Source-head containment
CI pass, Web smoke/audit fail, main pending. Global format/audit, review/acceptance,
remaining Core36/D4 reconciliation and D5–D7/stack audit stay open. No closure.

2026-10-19 D4.4 News surface increment for DEBT-027: all15 wildcard root exports
replaced by reviewed named contracts/types; concrete services/repository bindings
stay private. Only two existing Nest integration tokens exported. One foundation
E2E fixture uses internal service paths, assertions unchanged. Four new boundary
cases2 PASS/2 FAIL before and4/4 after; baseline68 →53, zero additions. Exact40
public names pinned by architecture fixture. Full gate/CI/acceptance pending.
[News surface evidence](../audits/D4_4_NEWS_EXPLICIT_SURFACE.md).

Final News surface PR #52 local gate: API1138/1138 and source/sibling gates pass;
full E2E507 PASS/1 FAIL of508, zero skips. Only unchanged News viewCount null/zero
(DEBT-045) fails; no DI/export failure. App26/Content Boundaries14/target17/News
snapshot16/redaction20/secondary audience21/related12 pass. Leaderboards passes
this run, not proof its order-sensitive fixture debt is fixed. Completed exact
Jest PID19092 stopped only after full JSON and zero clients/temporary schemas.
GraphQL generation succeeds, DEBT-044 check red, own drift restored and full SDL
hash unchanged. Source-head containment CI pass, Web smoke/audit fail, main pending;
format/audit/acceptance and full D4 remain open. No merge or closure claim.

2026-10-19 owner-approved D4.4 content presentation composition is locally wired:
root owns shared wire enums and four existing GraphQL operations; owners publish
four narrow capabilities, not concrete services. Policy/redaction stay owned.
Fourteen new cases plus five existing content boundary units pass; initial full
API opt-in coverage1134/1134. Two Prisma presentation baseline findings removed,
70 → 68, no additions; exact surface fixtures extended only for approved token/
type names. New HTTP cases and final gates are pending; no closure claimed.
[Composition evidence](../audits/D4_4_CONTENT_PRESENTATION_COMPOSITION.md).

Composition final pre-full-E2E: opt-in API1134/1134, lint/types/build/Prisma/
architecture pass; actual content HTTP14/14 with normal exit, all five added
guard/create/evaluate/invalid-enum/provider-failure cases pass. Full schema SHA-256
unchanged after AppModule boot, not only a source assertion. Disposable5435 reset
after exact validation and no clients; serial full E2E running. Global format41/
audit1 high10 moderate and later GraphQL/CI/acceptance remain open.

Final composition PR #51 local full E2E506 PASS/2 FAIL of508, zero skips:
all14 content HTTP, Content Target Transactions17, App26 and Leaderboard ownership30
pass. News null/zero and Leaderboards tie match DEBT-045; current read-only fixture
inspection confirms prior older points-user with10 month points wins unchanged
tiebreak. Only completed exact Jest PID8856 stopped after zero clients/schemas.
GraphQL generation passes; check DEBT-044 red, own drift restored; full SDL hash
unchanged. Source-head containment passes, Web smoke/audit fail, main CI pending.
No full-green, merge, review/owner acceptance or full D4 closure claimed.

2026-10-19 D4.4 representation progress for DEBT-027: Users presentation no longer
imports Prisma for the existing ACTIVE directory filter; configuration uses an
explicit Joi default binding with identical full schema fingerprint. Seven new
regressions pass after 5 PASS/2 FAIL baseline; full opt-in API 1120/1120 and
lint/types/build/Prisma/architecture/sibling tests pass. Inventory 72 → 70 with
zero additions. Global format/audit remain red; serial E2E/GraphQL/CI/acceptance
pending. [Evidence](../audits/D4_4_USERS_CONFIG_REPRESENTATIONS.md).
Owner requires isolated root presentation composition for remaining Content
Access/Editor enums; [design](../audits/D4_4_CONTENT_GRAPHQL_COMPOSITION_DESIGN.md)
only, no cross-feature exception or runtime migration implemented.

Final local PR #50 evidence: E2E485 PASS/18 FAIL of503, zero skipped. News null/zero
is DEBT-045; all17 Content Target Transactions cases fail before assertions on
shared schema.gql UNKNOWN/open initialization (DEBT-059), not17 independently
proven transaction defects. App26/Content Boundaries9/Leaderboard ownership30 pass.
Only completed owned Jest PID23080 stopped after exact command/zero DB clients/
temporary schemas verified. GraphQL generation passes but check remains DEBT-044
red; own barrel drift restored exactly. Source-head containment CI passes,
Web smoke/audit fail, main gate pending. No green/closure/acceptance claim.

2026-10-19 further D4.4 progress for DEBT-027: nine unused public/Nest application
service exports removed across Custom Titles, Leaderboards and Interactions.
Two Interactions integration tokens and named input/type contracts retained;
one E2E fixture import now internal, assertions unchanged. Nine boundary tests
pass after red baseline; reviewed inventory 81 → 72, zero additions. Full gate
and CI/review/acceptance pending. See
[private feature service evidence](../audits/D4_4_PRIVATE_FEATURE_SERVICES.md).

Final private-feature surface gates: coverage1113/1113, root/sibling gates pass
except inherited format/audit. Serial E2E501/503: News viewCount and recurring
DEBT-045 leaderboard shared-fixture tie. Read-only current DB confirms prior
points-user is older and has10 month points; unchanged age/ID tiebreak explains
the observed winner. App26 and ownership30 pass. Completed owned Jest PID21228
stopped only after zero DB clients/fixture schemas. GraphQL remains DEBT-044 red,
own generator drift restored. No fixture/assertion/ranking behavior changed;
CI/review/acceptance and full D4 remain open.

2026-10-19 bounded D4.4 progress for DEBT-027: AI Core now publishes only named
AiCoreModule; private command service/provider/resolver wiring retained. Three
new boundary tests fail before correction and pass after; full API coverage
1104/1104 passes. Exactly three wildcard baseline entries removed, 84 → 81;
remaining debt is not waived. Root/sibling gates pass except inherited global
format/audit; serial full E2E and GraphQL/CI/acceptance pending. See
[AI Core surface evidence](../audits/D4_4_AI_CORE_EXPLICIT_SURFACE.md).

Final local D4.4 AI Core E2E: 502 PASS/1 FAIL of 503, zero skips, App 26/26.
The failure is DEBT-059 schema.gql UNKNOWN/open during News initialization;
that case does not reach the known DEBT-045 assertion, so no fix is claimed.
Jest terminates normally with exit 1, no manual handle cleanup; zero DB clients
and fixture schemas afterward. GraphQL remains DEBT-044 red and own generated
side effects restored. CI/review/owner acceptance and full D4 remain open.

2026-10-18 persistence audit: DEBT-062 is confirmed by actual service/DB
concurrency (cap 1, two different events both count zero and award); owner approved
a separate user/rule/UTC-day atomic correction. Current packet only characterizes
the defect. Existing DEBT-007 also requires explicit automatic delivery wiring:
Worker integration events currently route only to Activity, while Points/Levels/
Achievements consume tests call services directly. This was already true before
D4 and is not a regression caused by narrow service exports. See the
[operation matrix](../audits/D4_PERSISTENCE_REVIEW_MATRIX.md).

2026-10-18 D4 progress: Leaderboards now consumes allowlisted ranking facts;
root assembles one unchanged parameterized statement from Auth, Users, Community
Points, Reputation, Levels, Custom Titles and Leaderboards-owned SQL fragments.
Fourteen real migrated golden cases and both original SQL fingerprints pass.
DEBT-060 is implemented in its separate approved packet, with verification and
CI/review acceptance tracked independently. Full gate/CI acceptance, D4.4,
D4.5 and exhaustive inventory remain open; no broad debt is marked resolved by
this transfer. See [runtime checkpoint](../audits/D4_LEADERBOARD_RUNTIME_OWNERSHIP.md).

| ID       | Priority | Status   | Area                  | Finding                                                                                                        | Proposed owner/package |
| -------- | -------- | -------- | --------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------- |
| DEBT-001 | Critical | OPEN     | Auth/Users            | Auth imports Users repository/mapper internals and owns user lifecycle decisions.                              | D2–D3                  |
| DEBT-002 | High     | OPEN     | Layering              | Auth and IAM application services access Prisma directly.                                                      | D3                     |
| DEBT-003 | High     | OPEN     | Module boundaries     | Reputation, Achievements, Community Points and Levels depend on broad foreign services.                        | D4                     |
| DEBT-004 | High     | OPEN     | Domain isolation      | Prisma enums/types leak into domain, application and presentation layers.                                      | D4                     |
| DEBT-005 | High     | OPEN     | Architecture tooling  | Boundary checker passes despite known ownership and layering violations.                                       | D2–D4                  |
| DEBT-006 | High     | ACCEPTED | Roadmap               | Current Position and Project Context reconciled in D1; owner PR review pending.                                | D1                     |
| DEBT-007 | High     | ACCEPTED | Phase 8               | Phase 8 classified implemented with completion audit; runtime/owner acceptance remains pending.                | D1/D6                  |
| DEBT-008 | High     | ACCEPTED | Phase 5               | D3.5 groups/Premium implemented with explicit approval; review/CI/full baseline acceptance pending.            | D3.5 / D6              |
| DEBT-009 | Medium   | OPEN     | File Passport         | Preliminary scan reports 247 potentially non-compliant source-like files; classification is required.          | D5                     |
| DEBT-010 | Medium   | OPEN     | Standards             | Older Auth/Authorization and role-based guidance conflicts with newer permission-based boundaries.             | D1–D2                  |
| DEBT-011 | Medium   | ACCEPTED | Workflow docs         | Canonical phase/workflow fencing repaired in D1; documentation checks pass, review pending.                    | D1                     |
| DEBT-012 | High     | ACCEPTED | Environment           | D0 env inventory and local alignment implemented; acceptance awaits the full quality gate.                     | D0                     |
| DEBT-013 | High     | ACCEPTED | Local services        | Mailpit, ClamAV and optional OTLP verified; S3 deferred to DEBT-017, persistent observability not claimed.     | D0                     |
| DEBT-014 | Medium   | RESOLVED | Developer tooling     | GitHub CLI installed and authenticated; repository PR and Actions access verified in D0.                       | D0                     |
| DEBT-015 | Medium   | OPEN     | Quality gate          | Root `quality` does not execute every check performed by CI.                                                   | D1/D6                  |
| DEBT-016 | Critical | OPEN     | Dependencies          | Audit 2026-10-21: 0 critical / 2 high / 12 moderate; local mitigations are not accepted audit exceptions.      | D0.5/D6                |
| DEBT-017 | High     | DEFERRED | Media/storage         | LOCAL scope approved; operational MinIO/S3 adapters absent, separate debt not blocking Phase 11.               | Storage package        |
| DEBT-018 | High     | DEFERRED | Search                | News-local search clarified; shared Search/indexing contract remains future work, not Phase 11 prerequisite.   | D2/future Search       |
| DEBT-019 | High     | ACCEPTED | File Passport         | Passport v3.1 rendering repaired in D1; generated/config/schema classification remains D5 work.                | D1/D5                  |
| DEBT-020 | Critical | OPEN     | Media security        | Windows separators bypass upload-root containment in API storage and two Worker consumers.                     | D0.6                   |
| DEBT-021 | High     | ACCEPTED | Quality orchestration | D0 adds shared-package build ordering; local lint/typecheck pass, clean CI evidence remains required.          | D0/D6                  |
| DEBT-022 | Medium   | OPEN     | Formatting            | D2 repository Prettier check reports 41 legacy non-compliant files (initial audit: 52).                        | D5/D6                  |
| DEBT-023 | Medium   | OPEN     | Worker tests          | Sharp output cleanup fails with `EBUSY` on Windows in the current diagnostic run.                              | D0.6/D6                |
| DEBT-024 | Critical | ACCEPTED | IAM/product ownership | Isolated IAM groups and Authorization Guardian decisions implemented; review/full baseline acceptance pending. | D3.5 / D6              |
| DEBT-025 | High     | ACCEPTED | Roadmap sources       | Legacy phases/milestones marked historical and linked to canonical roadmap; review pending.                    | D1                     |
| DEBT-026 | High     | OPEN     | Completion evidence   | Phase 9/10 completion gates are not currently reproducible from the red repository baseline.                   | D1/D6                  |
| DEBT-027 | High     | OPEN     | Public APIs           | Module roots broadly export concrete services and wildcard surfaces, enabling structural coupling.             | D2/D4                  |
| DEBT-028 | High     | OPEN     | Architecture rules    | Approved documents conflict on whether application services may access database services directly.             | D1/D2                  |
| DEBT-029 | High     | ACCEPTED | Worker environment    | D0 adds env loading, template and fail-fast validation; readiness verified, acceptance gate remains red.       | D0                     |
| DEBT-030 | High     | ACCEPTED | Endpoint contract     | D0 aligns Web API/GraphQL defaults and examples to 3001; root/application ownership documented.                | D0                     |
| DEBT-031 | High     | ACCEPTED | Bootstrap             | Node bootstrap verified on Windows with DB alignment guard; existing env files preserved.                      | D0                     |
| DEBT-032 | Medium   | ACCEPTED | Compose               | Dev/test healthchecks verified; original pgAdmin image pinned by digest; acceptance gate remains red.          | D0                     |
| DEBT-033 | Medium   | ACCEPTED | Observability         | Explicit telemetry startup and optional collector verified; no persistent monitoring backend claimed.          | D0                     |

## Additional D0 verification findings

D4.3d2 progress for DEBT-003/004/027: Activity no longer reads Users tables;
Users publishes three minimal context arrays and root composition binds the
Activity-owned port. Ranking is owned by Activity application rather than its
repository; six algorithm AST comparisons match. Import inventory stays 89,
not full SQL isolation. News delivery/mentions/shared-row obligations remain;
full D4 and release acceptance stay OPEN. See
[evidence](../audits/D4_3D2_ACTIVITY_VIEWER_CONTEXT.md).

D4.3d1 progress for DEBT-003/004/027: Content Gates reads only its own definitions;
its application composes minimal account/count/total ports through root adapters.
Media owns the Wall image query and publishes only a Boolean. No API/migration or
policy change; import inventory stays 89 (SQL ownership was not counted there).
Source-reviewed Activity/News/mentions/profile joins remain explicitly scheduled;
full D4 and release acceptance stay OPEN. See
[evidence](../audits/D4_3D_GATE_WALL_OWNER_EVIDENCE.md).

D4.3c progress for DEBT-003/027: owner-policy registration lives at the root,
Interactions registry and Media/Activity broad providers are private. News/Users
consume minimal evidence/projection ports. Ten further findings removed (99 → 89),
zero additions. Remaining cross-owner SQL is named D4.3d work and is not detectable
from import diagnostics alone. Full D4 remains OPEN; see
[evidence](../audits/D4_3C_POLICY_MEDIA_ACTIVITY_CONTRACTS.md).

D4.3b progress for DEBT-003/004/027: News/Wall cross-owner writes now use semantic
transaction ports; the target writer moves into owned infrastructure and is no
longer a business-root/Nest export. Four findings removed (103 → 99), no additions.
Real PostgreSQL verifies every target/content evidence failure rolls back the
whole unit. A blocking technical-entry guard now scans root composition too.
Full D4 remains OPEN; [evidence](../audits/D4_3B_ATOMIC_CONTENT_TARGETS.md).

D4.3a progress for DEBT-003/027: Editor and Content Access concrete providers
are private; News/comments consume owner-specific normalization ports and Editor
consumes decision-only gate evidence. Fifteen findings removed (118 → 103),
zero additions. Redaction/Premium/current revocation and persistence are verified;
remaining interaction lifecycle, News/Media/activity, ORM and explicit-surface
work stay OPEN. See [D4.3a evidence](../audits/D4_3A_CONTENT_CONTRACTS.md).

D4.2 further progress for DEBT-003/004/027: Reputation uses minimal evidence;
Media profile mutations and cross-owner writes are composed explicitly; broad
Users/Reputation providers are private. Ten further findings are removed
(128 → 118), zero additions. Full D4 is still OPEN; see
[D4.2 evidence](../audits/D4_2_REPUTATION_PROFILE_ASSETS.md).

D4.1 progress for DEBT-003/027: three gamification consumers now use minimal
recipient/balance ports; concrete service exports are private. Seven reviewed
findings are removed (135 → 128), with no additions. Remaining cross-module
and public-surface findings stay OPEN; see
[evidence](../audits/D4_1_GAMIFICATION_BOUNDARIES.md).

### D3.5 scope evidence (DEBT-008/024)

Current Content Gates derive `groups` from IAM role names and apply Premium
bypass from a case-insensitive `premium` name. This does not implement generic
group membership, expiry/revocation or a distinct Premium entitlement. D3.5's
[scope proposal](D3_5_ACCESS_GROUPS_BRAINSTORM.md) now records the concrete reader,
data, authority and legacy-key migration boundary. No automatic name-based
conversion or runtime implementation is approved by this evidence.

Subsequent owner approval authorizes a bounded gate correction: mandatory GROUP
audience before automatic Premium numeric bypass, without staff authority. See
[increment evidence](../audits/D3_5_PREMIUM_GATE_CONTRACT.md). Wider generic groups,
membership validity, role-type isolation and Guardian remain open; no full
DEBT-008/024 closure is claimed.

### D2 architecture contracts and inventory

[ADR-003](../architecture/adr/003-subject-and-access-ownership.md) records the explicit
owner approval: Auth owns opaque subject/credentials, Users owns profiles, separate
composition coordinates registration and response assembly. No D2 production or
schema change implements this yet; DEBT-001/002/004/027 remain OPEN.
[ADR-004](../architecture/adr/004-module-integration-contracts.md) describes synchronous
security ports, Outbox events, minimized projections and named public APIs for review.

The [frozen report-only inventory](../architecture/ARCHITECTURE_TOOLING.md) contains
156 diagnostics: 20 allocated to D3, 136 to D4. It exposes wildcard/concrete public
exports, foreign internals/services and persistence leaks, without waiving them.
DEBT-005 enforcement remains OPEN until D4; a baseline match is not compliance.
DEBT-010/028 documentation direction is reconciled; runtime/manual review remains.
DEBT-024 requires a separate D3.5 IAM groups/Premium scope approval and package,
scheduled after D3 and before final D6/D7 readiness. No implementation authorization
or Phase 14 sanction completion is implied. DEBT-037 remains an unresolved physical
storage threat-model decision, not a promise of sandbox isolation.

The current formatting count after D2 is 41 legacy files (43 after D1, 50 after
D0.6). Two touched historical ADRs were formatted while marking their status;
D2 does not mechanically reformat unrelated source.

### D1 documentation reconciliation

Owner-approved scope decisions are in `docs/development/D1_SCOPE_DECISIONS.md`.
Documentation remediation is recorded in
`docs/audits/D1_CANONICAL_DOCUMENTATION_2026-10-10.md`.
ACCEPTED entries below/above identify the named remediation package, not permission
to merge red checks or a claim of owner-reviewed completion. Historical findings
remain audit evidence; current outcomes are qualified in package reports.

### D0.5 dependency remediation progress

Branch `debt/d0-5-dependencies` reduces DEBT-016 from 7 critical / 63 high /
61 moderate / 9 low to 0 critical / 1 high / 10 moderate / 0 low. It is not
resolved: braces has no available registry patch. The owner-approved narrow
deepmerge-ts 8 override through Prisma configuration passes fresh migrations,
seed, generation and config compatibility checks. No advisory suppression
or risk exception was applied. Evidence and pending gates are recorded in
`docs/audits/D0_5_DEPENDENCY_REMEDIATION_2026-10-10.md`.

The approved braces local depth-guard patch passes 14 regression tests and
300 differential comparisons. This is a mitigation pending review, not an
accepted audit exception; DEBT-016 remains OPEN and security CI stays strict.

### DEBT-036 — Upstream braces expansion error (Low, OPEN, D6)

Differential compatibility review finds pristine braces 3.0.3 and the patched
copy both throw TypeError for expansion of some parenthesized patterns such
as `src/a/(a|b).ts`. This is separate from depth exhaustion; the patch preserves
the upstream result/error behavior. No affected application path is established.
Review supported pattern policy if such expansion is introduced; do not silently
absorb an upstream behavior rewrite into D0.5.

### DEBT-034 — Web smoke selectors drift (High, OPEN, D6 / frontend owner)

CI run `38064940272` fails Web smoke; the earlier run's logs explicitly wait
for `getByRole('link', { name: 'Enter Station' })` in `arrival.spec.ts:96`.
The current login/home surface does not expose that legacy entry point.
Impact: browser CI is red despite successful manual dev login. Reconcile
expected user journeys with the frontend owner before changing tests or UI.
No frontend redesign or smoke-test suppression is authorized by D0.

2026-10-16 PR #25 CI run `38842042604`, Web smoke job `116784112882`:
10 PASS / 3 FAIL again; failed arrival/guest home tests wait for the same
`Enter Station` link. Logs inspected directly; no frontend/test changes or waiver.

PR #26 run `38844155392`, Web smoke job `116790737919`: same locator and
10 PASS / 3 FAIL confirmed directly from logs (2026-10-16). Containment jobs
pass; this does not turn Web smoke or the overall review stack green.

### DEBT-035 — Local test concurrency exhausts memory (Medium, OPEN, D6)

A repeated Web unit-test run with dev processes and Docker services running
crashed multiple Node workers with `NewSpace::EnsureCurrentCapacity` and
`Committing semi space failed` allocation failures. Earlier identical tests
passed. Impact: the default local parallelism is not reliable under this
machine's concurrent workload. Retry with stopped dev processes and
`vitest run --maxWorkers=2`; evaluate a documented resource-aware test policy
in D6. This is not evidence of an assertion failure or a passing full gate.

D3.2 also reproduced resource exhaustion with the default parallel API coverage
command while other gates ran: one Jest worker crashed and a read-only Git diff
allocation failed. Retry API coverage sequentially with `--runInBand`; keep this
separate from a functional assertion failure or justification to lower thresholds.

## Entry policy

### D0.6 containment remediation progress

DEBT-020 and DEBT-023 have fixes on `debt/d0-6-storage-security`;
focused Windows/Ubuntu CI run `38077108683` passes. Owner acceptance remains pending
and the entries are not marked resolved before review. API and both Worker
consumers share `@dss/storage`; variant validation precedes filesystem effects.
Sharp metadata inspection is buffer-backed in tests; production caching is unchanged.
Evidence: `docs/audits/D0_6_STORAGE_SECURITY_2026-10-10.md`.

### DEBT-037 — Physical storage containment threat model (Medium, OPEN, D2/D6)

Lexical key validation cannot prevent a pre-existing symlink/junction or a local
filesystem race from redirecting IO outside uploads. D0.6 assumes directories are
application-controlled. There is no established remote exploit under this assumption.
Decide whether hostile local writers are in scope; if so, design OS-specific physical
containment and TOCTOU defenses. Do not silently expand this package or describe
lexical checks as sandbox isolation.

### DEBT-038 — API E2E exceeds CI job limit (High, OPEN, D6)

D2 Quality Gate run `38083005484` started API E2E at 20:17:17 UTC on 2026-10-10
and cancelled it at 02:15:22 UTC on 2026-10-11 after the six-hour job limit.
GraphQL contract verification and build were skipped. This is not a passing E2E
gate. Diagnose test/process lifecycle and infrastructure in D6; do not hide the
failure with force-exit or skipped assertions. D3.1's six selected real API E2E
tests pass locally in 40.952 seconds, but do not reproduce the complete CI suite.

### DEBT-039 — Owner vision and historical product naming (Medium, OPEN, D1 follow-up)

The owner explicitly names Mission Control as the user dashboard and Command Deck
as administration. Historical documents and the existing dashboard route disagree.
The owner's wiki-style Research Lab also needs reconciliation with Knowledge Forge
and the separately planned Research Lab. See `PRODUCT_VISION_1_0.md` for full 1.0
requirements and pending details. Perform a product gap/naming review before the
Phase 11 brainstorm, coordinated with the frontend documentation workstream;
do not silently rename routes, collapse modules or implement unrelated features
inside D3.

### DEBT-040 — REST authentication DTO runtime metadata (High, OPEN, D6 / API validation review)

The original AuthController imports RegisterDto, LoginDto and RefreshTokenDto as
type-only symbols. Nest's reflected body parameter metadata therefore does not
reference the DTO constructors (read-only reflection prints `Function` for all
three body parameters); class-validator decorators cannot enforce those
DTOs through the global ValidationPipe. The relocated composition controller
preserves this existing behavior, not a newly accepted validation policy.
GraphQL uses runtime input classes and is a separate path. Existing successful
REST registration tests omit displayName although RegisterDto declares it required.
Review required/optional fields and invalid-input compatibility, then switch to
runtime DTO imports with explicit regression tests. Do not silently turn this
boundary refactor into an API validation behavior change; no exemption is granted.

### DEBT-041 — Nondeterministic TOTP envelope tamper assertion (Medium, OPEN, D6 / Auth test owner)

A sequential D3.2 coverage run fails the unchanged TotpService test at line 23:
`decrypt(first.slice(0, -1) + 'x')` does not throw. The ciphertext is random and
the last base64url character can already be `x`, leaving the original bytes
unchanged. This is evidence of a flawed corruption test, not evidence of an
AES-GCM authentication bypass. Replace it in a separately reviewed test fix with
deterministic byte corruption and unchanged-envelope control. Keep the assertion
and security behavior; do not skip it, weaken encryption or claim rerun success
resolves the nondeterminism. No TOTP production/test edit is included in D3.2.

### DEBT-042 — Second-factor lifecycle concurrency review (High, IMPLEMENTED / review pending, D3.4)

Code inspection of the pre-refactor TwoFactorService shows that disable validates
the password and second factor before starting its delete/revoke/version/audit
transaction. Recovery consumption therefore commits separately: a failed disable
can leave its recovery code consumed. Concurrent credential replacement also
needs review between proof and mutation. Begin locks the second-factor row, not
the subject row; first setup has no existing row to lock. The D3.3 adapter preserves
these existing boundaries; passing tests do not prove those lifecycle races safe.
This is a code-ordering risk assessment, not a reproduced exploit. Auth acceptance
must decide locking/proof revalidation and API behavior, then add deterministic
concurrent begin/confirm/disable tests. Do not silently redesign the protocol in
the persistence transfer. The owner approved a separate D3.4 corrective package:
atomic proof/mutation under a subject lock, deterministic concurrency tests and
unchanged public API. Approval does not mean the defect is fixed.

The approved correction now locks the subject for all factor mutations and
verifies disable proof in the same transaction as recovery-use audit, deletion,
revocation and version increment. Deterministic DB barriers and a real API rollback
case verify the corrected ordering. See [D3.4 evidence](../audits/D3_4_TWO_FACTOR_ATOMIC_LIFECYCLE.md).
Implementation is not full D3 acceptance or permission to merge a red PR.

### DEBT-043 — Stale JWT permission grants after IAM revocation (High, IMPLEMENTED / review pending, D3.4)

Current JwtStrategy validates authoritative session/account eligibility, then copies
`payload.roles` and `payload.permissions` into the request principal. PermissionsGuard
checks that copied set. IAM role/direct-permission revocation does not increment
authVersion or revoke sessions. Code inspection therefore shows no authoritative
permission refresh on this guarded path: a previously issued token can retain a
revoked grant until expiry or another session-invalidating change. This is a
code-path assessment; no production incident or runtime exploit is claimed.

ADR-003 requires synchronous authoritative access decisions and immediate denial.
Resolve through an Authorization-owned capability/composition boundary, with real
tests using the same token before and after revocation, removal and grant changes,
plus fail-closed storage errors. Do not couple Auth to IAM assignments or silently
invalidate every authentication session as a substitute for access ownership.
This is a separate D3.4 security increment; the permission persistence transfer
does not fix it or claim complete access acceptance.

The correction now reads current roles and permissions after session validation,
through consumer-owned Core Auth and Authorization ports joined in root
composition. Old JWT grants are not an authority. A real same-token REST test
first reproduced revoked access returning 200 instead of 403; four corrective
E2E tests now pass, including GraphQL and fail-closed authority errors.
See [request access evidence](../audits/D3_4_AUTHORITATIVE_REQUEST_ACCESS.md).
This is a per-request snapshot, not cancellation of already running commands.

### DEBT-044 — GraphQL generator barrel drift (Medium, OPEN, D6)

On the D3.4 IAM persistence tree, `pnpm graphql:check` successfully parses the
unchanged API schema and Web operations, then exits 1 on its generated diff:
`apps/web/src/gql/index.ts` gains `/* eslint-disable */` above its existing export.
No schema or operation changes are involved. The verification side effect was
restored to the previously clean tracked version, with no hand-edited generated
implementation. Reconcile the checked-in output and configured generator in D6,
coordinated with the Web workstream, then prove clean regeneration. Do not waive
the consistency gate or claim it passes from successful generation alone.

### DEBT-045 — API E2E shared fixtures and News cleanup drift (Medium, OPEN, D6)

The full D3.4 API E2E run finished in 114.253 seconds with 44 passed and two
failed tests. Leaderboards assumes its own 10-point subject ranks first, but an
earlier Community Points fixture also has 10 points and an earlier creation
timestamp. A read-only DB query confirmed the winning `points-user-*` subject
preceded `leader-oldest-*` by about 20 seconds. The leaderboard test closes the
app without removing its fixtures. Global rank assertions are therefore not
isolated from other suites or previous runs.

The News foundation test first timed out at five seconds. A focused rerun instead
failed because it expected `viewCount: null` and received `0`; cleanup then tried
to delete an interaction target, rejected by the DB rule requiring retirement.
Jest subsequently reported open handles. News and leaderboard source/tests were
not changed by the request-access increment. D6 must establish owned fixtures,
correct cleanup and explicit view-count contract acceptance before correcting
assertions. Do not weaken DB protections, extend timeouts blindly, or call the
full E2E gate green. No out-of-scope implementation is included here.

2026-10-19 reconciliation verification adds an unresolved stability observation:
first combined full E2E 467 PASS/25 FAIL (one app-case 5000ms timeout, Reputation
suite schema.gql UNKNOWN open error, and known News null/zero); separate fresh
serial full E2E 491 PASS/1 known News FAIL, no skips, unchanged code/timeouts.
The extra failures did not reproduce, but their cause is not proven or fixed.
Both reports are preserved; do not turn one rerun into a stability certificate.
See [reconciliation evidence](../audits/D4_AUDIT_EVIDENCE_RECONCILIATION.md).
Core audit's subsequent isolated full E2E also times out in the same app case
with no parallel quality gates (494 PASS/2 FAIL of 496; other failure News).
Parallelism alone is therefore not an established explanation. The result is
preserved in [Core audit evidence](../audits/D4_CORE_EVENTS_PERSISTENCE_REVIEW.md);
stability/root cause remain open for D6, with unchanged assertions/timeouts.
Separately, Core audit's first guarded Node newline restoration of generated
Web barrel also hit UNKNOWN/open outside Jest, then identical retry succeeded
and Git diff verified clean outputs. This is additional host/filesystem evidence,
not proof of the same root cause or authorization for system reconfiguration.

Repeated during DEBT-052 verification on 2026-10-14: full API E2E executes all
25 suites / 211 tests, with 24 suites and 210 tests passing. The sole failed
News-foundation test again expects viewCount null but receives zero; afterAll
again violates the interaction-target retirement trigger. Jest reports completed
assertions followed by open handles. The owned local run was interrupted only
after that explicit final summary; no forceExit/test skip/trigger change was used.
Its production repository and fixture source are unchanged by DEBT-052. This
confirms the existing D6 blocker, not green full E2E acceptance.

DEBT-053 verification repeats the broader fixture problem: News now also reports
hasNextPage true where its global fixture expects false; leaderboards observes
another 10-point subject/currentLevel; achievements receives two AWARDED and two
DUPLICATE results where it expects one pair. Its event test reads all enabled
matching rules in a shared database. These are observed assertion/source facts,
not a new product root-cause claim. Twelve tests fail in the complete 244-test
attempt, including the existing registration timeout and profile-assets hook
timeouts. All seventy relevant isolated-schema News/composition E2E pass inside
that same attempt. D6 must disposition the global fixture failures independently;
no unrelated test/production behavior is changed by DEBT-053.

Approved DEBT-053 batch follow-up, final frozen-source fresh-DB run: 244 PASS /
2 FAIL across 29 suites/246 tests, zero skipped; all 72 directly relevant E2E
pass. News repeats viewCount null-versus-zero and prohibited target-deletion
cleanup. Leaderboards repeats a 10-point tie with an earlier `points-user-*`;
read-only synthetic-DB inspection confirms it precedes `leader-oldest-*` by
about eight seconds. The previous clean attempt had 245/1, but that does not
establish fixture isolation. Final JSON completes before open-handle cleanup;
only the verified owned Jest runner was stopped. D6 remains open, not waived.

DEBT-054 repeats on a fresh migrated target: full E2E 256 PASS/2 FAIL, 258 tests,
zero skipped. News has the same viewCount/cleanup failure; this time the second
failure is registration/GraphQL viewer exceeding five seconds, not leaderboard.
An isolated repeat of the entire Auth E2E suite passes all 26 tests with zero
skips and normal exit. This does not waive the full-run timeout or establish its
cause. No timeout, auth behavior, shared fixture or DB trigger was changed.

DEBT-051's frozen-source full E2E is 259 PASS/3 FAIL, 262 tests, zero skipped:
News viewCount/retirement cleanup, registration deadline and leaderboard tie.
All 113 directly related News/composition cases pass. Read-only inspection
confirms the winning synthetic points fixture precedes the leaderboard fixture
by about 45 seconds. The full run stays red; no assertion, timeout, cleanup
protection or unrelated product behavior is changed to suppress it.
The isolated entire Auth E2E repeat passes all 26 tests, zero skips, normal exit;
this does not prove why the full-run registration deadline was exceeded.

Fresh D4 IAM transactional subject transfer run (2026-10-16) repeats both known
cases: **427 PASS / 2 FAIL**, 429 tests / 41 suites, zero skipped. All 29 relevant
IAM/subject/HTTP and 26 Auth cases pass. Read-only inspection confirms the
winning synthetic `points-user` and expected `leader-oldest` each have 10 month
points, but the former was created 4.093 seconds earlier; all-time totals 10/60
explain the differing level projection. Unchanged points/createdAt tie-breaking
therefore selects the other suite's fixture. News repeats viewCount null/zero
and prohibited target cleanup. Complete JSON precedes retained-handle cleanup;
verified own Jest PID 2188 is stopped after zero client connections/owned schemas,
exit -1. No scoring, ordering, fixture, assertion or protection changes.
See [IAM transaction evidence](../audits/D4_IAM_SUBJECT_TRANSACTIONS.md).

Leaderboard characterization foundation (2026-10-16): full E2E **454 PASS / 2 FAIL**,
456 tests / 43 suites, zero skipped; all 14 isolated migrated ranking cases PASS.
News repeats null/zero. Read-only synthetic-DB inspection proves the other
10-point month fixture was created **66.927 seconds earlier** than leader-oldest;
all-time totals 10/60 explain the level difference. Ranking code is unchanged.
Completed JSON precedes verified own Jest PID 23832 cleanup after zero clients
and owned schemas; terminal exit 1. No fixture/scoring/assertion/protection change.
See [foundation evidence](../audits/D4_LEADERBOARD_CHARACTERIZATION.md).

### DEBT-046 — Last privileged role-holder removal is unguarded (High, IMPLEMENTED / review pending, D3.4)

At `a9c5596`, UserAccessService.revokeRole does not invoke the existing
last-administrator safety helper or count other holders. Two isolated service
probes expecting denial for a sole `admin` or `super_admin` assignment instead
resolved with an empty access summary. This is controlled service-level runtime
evidence, not a production incident or real DB/API reproduction. The endpoint
requires `roles.update`; an authorized destructive action can remove the last
protected assignment. No claim of anonymous access or unavoidable total lockout
is made.

The owner approved a separate corrective D3.4 package: atomic current role and
assignment validation/count/removal under a role lock, deterministic concurrent
revocation tests and HTTP regressions, preserving successful response shapes.
Keep the safety rule in application policy and transactions in IAM infrastructure.
Do not add a racy count-before-delete check. Broader usable-administrator paths
remain an explicit acceptance concern, not automatically fixed by role counts.
See [review and approved scope](../audits/D3_4_LAST_ADMIN_REVOCATION_REVIEW.md).
The correction is now implemented through a private IAM capability: role lock,
current-state validation/count, synchronous application policy and deletion in
one READ COMMITTED transaction. Seventeen service/real DB tests and seven real
HTTP/GraphQL regressions pass, including observed concurrent lock barriers for
both privileged roles. See the report's implementation section for exact gates.
This protects IAM role revocation, not every path to administrator ineligibility;
broader acceptance and required CI remain open.

### DEBT-047 — Assignment protection does not ensure administrator availability (High, OPEN / scope approval required, D3.4)

Source review at `c9659e0` found that protected-role revocation counts inactive
holders, while Auth self-deactivation changes eligibility without consulting an
availability policy. IAM critical permission rename/delete and role-permission
revocation also lack such a policy. PermissionsGuard requires actual permission
keys, so protected role names do not prove recoverable administration. This is
static call-path evidence, not a reproduced total lockout or irreversible loss;
self-reactivation exists. UsersService.changeStatus is a latent ownership leak
with no production caller found, not a demonstrated public bypass.

Proposed ownership: root composition coordinates Auth eligibility and IAM
assignment commands through narrow contracts; Authorization defines/evaluates
the agreed recovery capability set. Do not add IAM reads to Auth. Agree that set,
single-subject versus distributed coverage and shared concurrency boundary
before implementing. Require deterministic cross-owner DB concurrency, rollback
and HTTP tests. See [acceptance review](../audits/D3_4_ADMINISTRATOR_AVAILABILITY_REVIEW.md).
No corrective implementation is authorized by this discovery. DEBT-046 remains
implemented for its assignment-only scope; D3 acceptance remains open.

On 2026-10-13 the owner authorized policy design. The
[six-key recovery proposal](DEBT_047_POLICY_PROPOSAL.md) is ready for review;
its predicate, shared serialization and bootstrap behavior are not yet approved
for implementation. No runtime correction is claimed.

Subsequent owner clarification supersedes that six-key policy proposal: platform
owner is unique and non-transferable. New owner rights and Command Deck features
must be scheduled in their relevant phases, not implemented now. See
[accepted decisions](COMMAND_DECK_OWNER_DECISIONS.md). DEBT-047 remains an open
availability finding requiring explicit disposition at security acceptance;
deferral of new product functionality is not proof that the risk is resolved.

### DEBT-048 — Broad GraphQL registration test repeatedly exceeds its timeout (Medium, OPEN, D6)

During registration atomicity verification, selecting five tests from
`app.e2e-spec.ts` twice yielded four passes and one five-second timeout in
`registers and resolves the authenticated viewer through GraphQL`. The second
run had no parallel build/unit gate. That single test begins at line 1127 and
also exercises editor/profile and many subsequent flows before the next test.
Shutdown emits an Apollo warning about an operation arriving while closing.
No root cause of the stalled operation is claimed from timeout alone.

The four focused registration/rollback tests pass in a separate terminal run;
the new eight real-DB tests pass. Do not infer full GraphQL/E2E acceptance from
those results. D6 should trace and split independently owned flows with proper
cleanup and diagnose the slow/failing operation; do not raise timeouts blindly.
See [registration evidence](../audits/D3_REGISTRATION_POSTGRES_ATOMICITY.md).
No out-of-scope E2E restructuring is implemented by this package.

### DEBT-049 — Historical migrations and Prisma schema drift (Medium, OPEN, D6)

On 2026-10-13, after all 53 migrations were applied to the disposable test DB,
`prisma migrate status` reported up-to-date but
`prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code`
returned 2. The diff contains historical updatedAt defaults on achievements,
comments, points, titles, interactions, levels, reactions and reputation; the
outbox ID native type differs; two users indexes are present in SQL but absent
from the Prisma model. No difference is reported for the three new IAM tables.
The D3.5 schema diff changes no old model semantics, only adds the membership
relation/tables and formatting. This is migration/model alignment evidence,
not proof of lost data or a production incident.

D6 should classify intentional SQL-only constraints/indexes versus accidental
drift and reconcile by reviewed forward migration/model annotations. In
particular, do not blindly apply a generated diff dropping indexes or changing
outbox identifiers. D3.5 does not modify these unrelated tables or waive the gate.
See [D3.5 evidence](../audits/D3_5_ACCESS_GROUPS_IMPLEMENTATION.md).

### DEBT-050 — Web coverage reports an unhandled React scheduler error (Medium, OPEN, D6)

CI run `38446264899`, job `115465567069`, head `f9784af`, failed on coverage
before API E2E/generated validation/build. All 25 Web suites / 59 tests passed,
but Vitest reported one uncaught `ReferenceError: window is not defined` in
`react-dom-client.development.js:17920`, called by scheduler's
`Immediate.performWorkUntilDeadline`. Vitest attributed the originating context
to `apps/web/src/features/editor/editor-ai-dialog.spec.tsx`; this does not prove
the component itself threw the error. D4 has no frontend source changes.

The current full local Web unit/coverage repeats pass with two workers. Possible
unsettled scheduler work during environment teardown is an inference, not a
confirmed root cause or a product-runtime incident. A passing retry does not
waive the observed CI failure. Proposed owner: frontend test lifecycle / D6
quality baseline; investigate async cleanup and reproduce under Linux/CI load
before changing tests or implementation. No frontend correction is included or
authorized by this finding; coordinate separately with the owner/frontend work.

Repeated evidence on 2026-10-14: CI `38496166012`, head `5bff17f`, is authoritatively
completed/failed at Unit tests with coverage, with Web `ReferenceError: window is
not defined` again attributed to editor-ai-dialog.spec.tsx. API E2E/generated/build
did not execute on that run. This is repeated DEBT-050 evidence, not a new backend
regression or permission to change frontend. No manual retry was performed.

### DEBT-051 — Full News skips attachments in canonical EditorDocument (High, ACCEPTED / implemented, review pending)

On 2026-10-14, the unchanged increment-base `PrismaNewsDeliveryRepository.attachmentLabels`
was executed against the actual EditorDocument shape: `{profile:'NEWS', content:
{type:'doc', content:[attachment]}}` returns no labels, while the inner doc node
returns the expected media ID/label. The visitor descends only array-valued content.
Real migrated AppModule E2E creates a canonical News draft through NewsService,
confirms its active Media reference and eligible metadata, then observes an empty
attachments array in fullBySlug and public GraphQL Full News. Files/reference data
remain stored; this is a missing delivery manifest, not evidence of data loss.

D4.3d3a transfers the exact old traversal semantics and records a characterization
test, not a functional fix. Its legacy doc-node metadata fixtures must not be used
to claim canonical attachment publication works. Proposed separate correction:
unwrap/traverse the canonical document, preserve contentGate subtree exclusion,
first-position/last-label semantics and current READY/PUBLIC/active-reference rules,
then add canonical create/read regressions. The owner approved this separate
correction on 2026-10-14, after priority DEBT-052. No behavior correction is
included in D4.3d3a; implementation and acceptance remain OPEN.

The separate `debt/debt-051-canonical-attachments` package now unwraps the NEWS
envelope's doc root only at entry, retaining legacy traversal and every gate
subtree exclusion. Media policy and binary delivery are unchanged. New positive
regressions first fail on the unchanged service (units 34 PASS/2 FAIL; E2E
24 PASS/1 FAIL), then pass after correction. Current projection units 36 PASS,
focused real E2E 72 PASS (29 attachment cases), full opt-in coverage 898 PASS,
zero skipped; new attachment threshold does not lower any existing threshold.
Canonical negative cases use actual GraphQL for media/reference eligibility,
not only legacy component shapes. Stored documents/revisions/references remain
unchanged by reads; current eligibility and provider failures are covered.
Full gates/review/CI remain OPEN. See
[the corrective plan](DEBT_051_CANONICAL_ATTACHMENTS_PLAN.md). Metadata acceptance
does not certify binary access or close the release blocker before review.
Final local lint/types/Prisma/build/architecture PASS; fresh workspace units PASS.
Full API E2E is 259 PASS/3 FAIL (DEBT-045); isolated Auth 26 PASS. Global format/
audit/generated and Web smoke remain red with current logs. No frontend change,
skip, timeout increase, relaxed assertion or database-protection bypass.

### DEBT-052 — Full News bypasses server-side Content Gate redaction (Critical, ACCEPTED / implemented, review pending)

On 2026-10-14, an isolated all-migrations AppModule E2E published a PUBLIC News
article containing a synthetic contentGate payload and a real COMMENTS=100 gate.
EditorContentDeliveryService.project for the guest removes the synthetic text,
but an unauthenticated fullNews GraphQL response still contains it in documentJson.
The delivery repository serializes the raw canonical document and the full News
application/resolver path does not invoke viewer-safe Editor delivery. This is
confirmed response-boundary disclosure, not merely a suspected frontend issue.
Only synthetic fixture text was used; no real private content was queried.

This blocks release/Phase 11 readiness. Passing characterization tests explicitly
document the vulnerable baseline and are not security acceptance. Proposed separate
priority security package: publish a minimal viewer-safe Editor projection contract,
consume it through a News-owned port/root adapter, enforce server redaction before
the full response, and test guest, GROUP/Premium/author/current state and provider
failure paths. Review related public document/search/metadata projections; do not
claim those channels safe solely from fixing this one path. The owner approved
this separate priority security package on 2026-10-14. See the
[implementation and acceptance plan](DEBT_052_FULL_NEWS_REDACTION_PLAN.md).
D4.3d3a does not silently change audience/redaction policy or waive the finding;
the correction was not implemented in that increment. The Critical finding
remains OPEN pending the separate correction's full verification and review.

Implementation checkpoint on branch `debt/debt-052-full-news-redaction`, based
on published `5851381`: named Editor viewer-document contract, private projection
adapter, News-owned input/root composition and response replacement are in place.
Twenty new migrated E2E cases pass, including eighteen security/compatibility
cases and two explicit adjacent disclosure characterizations. Full opt-in API
units: 800 PASS; focused E2E: 45 PASS. Coverage/build/lint/types pass; full E2E
and baseline format/audit/generated/Web gates remain RED, with CI/review pending.
See the [corrective evidence report](../audits/DEBT_052_FULL_NEWS_REDACTION.md). The original
disclosure expectation is changed to require absence of denied text. This is
progress, not full release acceptance or resolution of DEBT-051/053.

### DEBT-053 — Public News search matches denied Content Gate text (High, ACCEPTED / separate security package)

On 2026-10-14, `news-viewer-redaction.e2e-spec.ts` creates a real canonical PUBLIC
News article with a COMMENTS=100 gate and synthetic text absent from its title,
summary and ordinary body. After the DEBT-052 correction, guest Full News removes
the text, but an unauthenticated `news(input:{search: marker})` returns the article
and a non-zero total; a unique absent-marker control returns zero. The response
does not directly return the hidden text. This demonstrates a search-match/count
oracle over protected content, not a confirmed arbitrary-content dump or real
private-data access.

Source path: News writes the generic Editor `searchText` projection, which includes
gate subtrees; News delivery filters that stored projection before pagination.
Changing Full News response JSON does not repair search eligibility. The positive
search characterization is explicitly not security acceptance.

Proposed separate News-local security package: design and enforce viewer-safe
search evidence, preserving correct total/pins/pagination and allowed content
search; reconcile already stored projections through reviewed backfill/migration
if needed. Do not remove full-text search, filter after paging, or introduce the
deferred shared Search Platform as a shortcut. On 2026-10-14 the owner approved
this as a separate package after DEBT-052. The owner subsequently approved the
hybrid public index/authenticated gated-document projection architecture with
performance tests and no hidden result cap. Implementation has started on
`debt/debt-053-news-viewer-search`; the first increment adds Editor-owned public
projection/search contracts, not a live News query correction. See the
[implementation plan](DEBT_053_NEWS_VIEWER_SEARCH_PLAN.md). Storage/backfill,
query composition and actual response/performance acceptance remain OPEN.
The next local increment adds versioned News-owned projection storage, atomic
draft writes, invalidation, source-locked canonical backfill and a published
maintenance port/CLI. Fifty-six focused migrated E2E pass; real disposable-data
backfill/readiness passes without authored-document changes.
The local runtime increment now replaces raw body matching with public evidence
and bounded viewer projections in a repeatable-read snapshot. Eleven new live
query E2E and the corrected twenty-case Full News suite pass; hidden-only guest
matches no longer enter items/pins/totals. An isolated 1,000-article corpus with
600 gated articles passes complete numbered/cursor pagination, but its member
p95 is 3.657 seconds against the unchanged five-second transaction budget.
A concurrent DB-gate run exceeded that budget; storage fixture timeouts and
broader full-suite failures also require disposition. This is not accepted
capacity or a green full package. No timeout increase, result cap or raw fallback.
See the plan for current verification and residual performance risk.
The owner-approved follow-up reuses private viewer evidence only inside an
explicitly closed batch of at most 64 documents. Frozen-source API coverage:
890 PASS/137 suites, all DB/Redis opt-ins and eight thresholds enforced;
lint/types/Prisma/build and 52 architecture fixtures PASS (inventory 89).
Distinct-document/gate performance plus concurrent-viewer/outage E2E: five PASS.
At 1,000 articles/600 gates, each request reads facts/audience 10 times rather
than 600; local member p95 1.022 seconds versus strengthened baseline 3.079.
No cross-request cache, timeout increase, cap or public API change. This is not
production capacity acceptance; full-suite/baseline gates and review remain open.
On 2026-10-20 the unchanged News search performance E2E again exceeds the
existing 5000ms interactive transaction budget (observed 5383ms and 5243ms)
during the Media design-only packet's full E2E. This is a recurring residual
performance failure, not evidence that Media runtime changed. No timeout,
corpus, pagination or security assertion is relaxed; exact final run results
belong to the Media foundation report. Host-load causality is not established.
Final fresh full E2E: 244 PASS/2 FAIL (DEBT-045); all 72 relevant E2E PASS.
Global format/audit remain red, and generated/Web evidence is the prior checkpoint.
Draft PR #12 contains the implementation and the batch follow-up; no merge or
debt-closure claim. Independent review and operational acceptance remain open.
DEBT-052 remains a separate Full News correction; no search policy
or historical projection is silently changed by that package. Release/Phase 11
security acceptance must disposition this confirmed channel explicitly.

Every new entry should include evidence, impact, proposed ownership and a clear
decision before implementation. Discovery is not permission to expand the
current package silently.

### DEBT-054 — Full News related summaries expose MEMBERS-only article metadata (High, ACCEPTED / implemented, review pending)

On 2026-10-14, the migrated `news-viewer-redaction.e2e-spec.ts` creates canonical
PUBLIC and MEMBERS-only News articles, grants its synthetic actor the existing
`news.links.manage` permission and creates a RELATED link through NewsLinksService.
The guest Full News request for the member article returns null, but the guest
Full News request for the public source returns the member article's synthetic
headline and slug in related summaries. Only synthetic test data was used.

Source: the outgoingLinks projection filters targets by PUBLISHED status, not
the viewer's article audience. No hidden full document is returned in this
reproduction; the leak is metadata from an otherwise inaccessible article.
Chronological neighbor queries separately restrict candidate visibility to PUBLIC;
that source observation is not exhaustive platform audience acceptance.

Proposed separate News delivery security correction: apply the same eligible
target-article audience rules to related summaries, preserve eligible ordering
and link semantics and test guest/member plus current target publication state.
No new generic ACL product feature, staff/owner authority or frontend design.
DEBT-052 documents this adjacent finding but does not silently alter unrelated
delivery queries. On 2026-10-14 the owner approved a separate correction after
DEBT-053. Implementation is now on the separate
`debt/debt-054-related-audience` review branch, based on published DEBT-053
`086aae3` / draft PR #12; no parent acceptance or merge is implied.
The outgoing target relation reuses News's existing article eligibility
predicate before selecting summaries. Twelve new migrated GraphQL regressions
first report 8 PASS/4 FAIL on the unchanged repository; after correction all
12 pass, with all 73 focused E2E and 890 opt-in API coverage tests passing.
Ordering, three link kinds, cross-language targets, current status/visibility
and publication-date fallback are covered. No generic group ACL, migration,
frontend or new staff authority is added. Full gates/review/CI remain open;
see [the implementation plan](DEBT_054_RELATED_AUDIENCE_PLAN.md).
Final local gates: lint/types/Prisma/build/architecture PASS; fresh other workspace
units PASS. Full API E2E 256 PASS/2 FAIL (DEBT-045); isolated Auth suite 26 PASS.
Global format/audit/generated and Web smoke remain red with current evidence;
no skip, timeout increase, trigger weakening or frontend fix. The finding is
not yet accepted as closed for release/Phase 11 readiness.

### DEBT-055 — API production start points at a missing local build entry (High, OPEN, D6)

On 2026-10-14, inspecting the existing build output before a fresh build of the
current storage increment found `apps/api/dist/src/main.js` but no
`apps/api/dist/main.js`. The existing `start:prod` command is `node dist/main`;
executing that exact command from apps/api exits immediately with MODULE_NOT_FOUND,
before loading application code or connecting to any service. A successful
compiler/build gate is therefore not evidence that this production start works.

D6 must reproduce the output layout from a clean build, reconcile the intended
runtime entry without breaking other compiled paths, and verify actual process
readiness. The current evidence proves the local start failure, not its complete
root cause or behavior in every deployment. No entry/compiler/runtime fix is
silently included in DEBT-053; owner notification accompanies this finding.

D6 now corrects the production command to the observed clean Nest build entry,
adds a post-build entry/syntax regression to quality and CI, and verifies actual
production-mode HTTP liveness/readiness with disposable DB/Redis. The owned
smoke process and DB connections are released; SDL is unchanged. Final gates,
remote CI and review remain open; see
[bounded verification](../audits/DEBT_055_API_PRODUCTION_START.md).

### DEBT-056 — Guest News secondary reads bypass MEMBERS audience (Critical, IMPLEMENTED / acceptance open)

On 2026-10-14, real migrated AppModule/GraphQL characterization publishes a
synthetic MEMBERS article, then creates a comment/reaction through actual owned
use cases. An anonymous request receives `fullNews: null` for its address but
`newsComments` returns total 1 plus the synthetic restricted comment body and
canonical JSON. `newsRatingVotes` likewise returns the voter identity/total.
A PUBLIC guest control remains readable. No real private content was accessed.

Source: secondary repository pre-reads check status/allowComments or allowRating,
not article visibility/publishedAt; rating presentation does not forward viewer
identity at all. Full News redaction/related/search corrections do not guard these
separate projections. This is confirmed restricted comment disclosure, not merely
an inferred identifier oracle. Passing characterization is not security acceptance.

Proposed correction: apply current News article eligibility before secondary
queries, preserve missing/disabled empty-page behavior and correct totals/pages,
and forward authenticated viewer identity for ratings without changing GraphQL
shape. No generic group ACL, staff bypass, frontend or owner-role feature.
The owner explicitly approved a separate priority DEBT-056 package before D4
runtime ownership transfer. It is not silently repaired by characterization.
See [D4 read-boundary foundation](D4_3D3_NEWS_DELIVERY_BOUNDARIES.md).

The separately approved correction now reuses existing article eligibility for
both pre-reads and forwards verified optional viewer identity for rating pages.
Corrected red baseline: 19 PASS / 8 FAIL; focused post-fix: 39 PASS, zero skipped,
normal exits. This closes the reproduced path locally, not full release
acceptance. API coverage 899 PASS; root lint/types/Prisma/build/architecture PASS.
Full E2E 287 PASS / 2 FAIL (DEBT-045); isolated Auth 25 PASS / 1 FAIL on the same
five-second registration deadline. Global format/audit/generated consistency and
the bounded guest Web entry check remain red. Full gates/review/CI remain open; see
[the bounded correction plan](DEBT_056_NEWS_SECONDARY_AUDIENCE_PLAN.md).

### DEBT-057 — Valid comment tombstones break News GraphQL non-null body (Medium, OPEN, separate correction required)

On 2026-10-14, an author tombstones a synthetic PUBLIC News comment through
CommentsService.remove. Stored body/document become null with deletedAt set,
as the Interactions/domain contract permits. Guest newsComments then reports
`Cannot return null for non-nullable field NewsComment.body` instead of a valid
tombstone page. The old body is not present in the response; no deleted-content
disclosure is claimed. Its immutable history/DB protections were not disabled.

Source: NewsCommentItem permits nullable body/documentJson, but News GraphQL
declares required body. Reconcile the public tombstone contract and generated
client compatibility in a separate reviewed package; do not insert a fabricated
body or silently change schema during SQL ownership migration. Owner was notified.
No correction is authorized by the D4 snapshot or DEBT-056 approval.

### DEBT-058 — Existing Web document-tool test exceeds unchanged five-second deadline (Medium, OPEN, D6 / frontend test owner)

On 2026-10-16, the D4 gamification transaction package's adjacent full Web coverage
run reports 58 PASS / 1 FAIL across 25 suites. The unchanged test
`DssEditor document tools > exposes document-grade tools only for the WIKI profile`
in `apps/web/src/features/editor/dss-editor-document-tools.spec.tsx:46` times out at
5000 ms (reported case duration 5244 ms). API coverage and lint were running
concurrently. This correlation is not proof that host load caused the timeout,
nor evidence of a frontend runtime or backend regression.

No Web source, expectation or deadline is changed. Preserve the initial red run
separately from any bounded repeat. D6/frontend test ownership should trace the
async tool/render lifecycle and resource behavior before deciding a correction;
do not hide the result by raising timeouts, skipping assertions or changing UI.
This is distinct from DEBT-050's unhandled React scheduler error and DEBT-035's
worker allocation failures. Owner was notified; separate implementation requires
scope agreement. Local raw evidence: `node_modules/.cache/dss-d4-gamification-web-unit.log`.

A subsequent repeat of the entire Web coverage suite with two workers passes
59/59 (29.57 s), using the unchanged five-second deadline and assertions. No
frontend code is changed. Passing that bounded repeat neither closes the initial
failure nor establishes host contention as its cause. Separate raw evidence:
`node_modules/.cache/dss-d4-gamification-web-repeat.log`.

### DEBT-059 — API E2E schema output intermittently fails to open on Windows (Medium, OPEN, D6)

2026-10-16 Authorization read transfer full E2E: 436 PASS / 6 FAIL out of 442.
One assertion is the known DEBT-045 News null/zero mismatch. Five cases in
Community Points Ledger (one), Outbox (two), Audit (two) fail in AppModule init
before their assertions: `UNKNOWN: unknown error, open` on
`apps/api/src/schema.gql`, from Nest GraphQL FileSystemHelper.writeFile.
All nine new Authorization ownership cases and existing Authorization nine pass.

The file exists with normal Archive attributes after the run and has no Git diff.
No evidence establishes antivirus, another process, ACL, filesystem or test
concurrency as the cause. Do not classify this as a proven authorization regression
or waive it as harmless environment noise. Full JSON/terminal evidence retained;
only completed own Jest PID 9280 stopped after zero DB clients and owned schemas.

Bounded repeat of all three affected suites plus Authorization ownership passes
14/14, normal exit (12.624 s), unchanged expectations/deadlines/DB protections.
This does not replace the full red result or close this debt. Investigate schema
output lifecycle and write failures separately in D6; no generated-output location,
test boot configuration, deadline or runtime correction is authorized by this
ownership package. Owner notified. Raw evidence: `node_modules/.cache/d4-authz-full-e2e*`
and `node_modules/.cache/d4-authz-affected-repeat*`.

### DEBT-060 — Leaderboard empty page loses total when viewer is absent (Medium, ACCEPTED, separate correction implemented; acceptance pending)

Isolated real migrated characterization on 2026-10-16 reproduces the production
repository returning total=0/totalPages=0 for page 99, limit 1, missing viewer,
while page 1 returns total=1 for the same active population. The SQL returns only
the requested rank range or viewer row; the mapper derives total from returned
rows and falls back to zero when neither exists. An existing off-page active
viewer retains total correctly. This is not a score or permission leak.

The normal GraphQL path requires an authenticated viewer; direct repository use
and a viewer excluded before the ranking read expose this edge. No claim of an
unauthenticated HTTP reproduction. Test pins the legacy behavior explicitly as
DEBT-060 in the historical ownership packet to keep that transfer behavior-neutral, not to endorse zero as the
intended count. Owner notified and asked about a separate correction after transfer.
Preserve ranking/one-statement visibility when fixing; do not add an uncoordinated
count query or silently rewrite this in the ownership package. Evidence:
`apps/api/test/leaderboard-ownership.e2e-spec.ts` and the Leaderboard ownership plan.

Owner approved a separate DEBT-060 correction after ownership transfer on
2026-10-16, preserving one SQL view and current ranking. Implemented separately
on 2026-10-18: the same statement returns population total independently of page
rows. A Leaderboards-owned LEFT JOIN projection preserves counts without an
independent query; root strips the technical null page row and allowlists facts.
Thirty isolated migrated cases pass, including all periods and missing/ineligible
viewers, last partial pages, empty populations and current deactivation counts.
Ranking-prefix hashes and exact bindings remain unchanged; complete SQL-tail
hashes deliberately version the approved correction. Full gates/CI/review are
recorded in [DEBT-060 checkpoint](../audits/DEBT_060_LEADERBOARD_TOTALS.md), not
inferred from the focused tests. No broad D4 or Phase 11 acceptance is claimed.

### DEBT-061 — Worker processed-marker and dead-letter consumer identities differ (Medium, ACCEPTED, D6)

`apps/worker/src/main.ts` configures `dss.worker.integration-events.v2` for
DeadLetterService, but calls createIntegrationEventProcessor with only store and
handler. Its default is `dss.worker.integration-events.v1`, so processed markers
and dead-letter consumer/job IDs use different identities.

2026-10-16 read-only AST + actual built-class diagnostic confirms factory arity 2,
marker read/write consumer v1, DLQ consumer/job suffix v2, without loading main
or connecting to Redis/PostgreSQL/SMTP. No evidence establishes event loss or an
exploit. Correct separately with explicit target identity and historical marker/
replay policy, not a cosmetic version rename in the Leaderboards package.
Owner notified; runtime fix not authorized by this source audit. Evidence:
[Worker boundary review](../audits/D4_WORKER_SOURCE_BOUNDARIES.md).

Owner approved v1 preservation on2026-10-22: a shared Worker-owned identity for
processor/new DLQ; historical markers and DLQv2 are not renamed/deleted; current
retry stays intact. Implementation,50 Worker unit tests and3 actual migrated
DB/live Redis regressions pass locally, with isolated resources cleaned up.
Full gates and remote review remain open; see
[approved design and evidence](../audits/DEBT_061_CONSUMER_IDENTITY_DESIGN.md).

### DEBT-062 — Distinct events exceed Community Points UTC-day cap (High, ACCEPTED, separate correction approved)

`PrismaCommunityPointsRepository.award` locks eventId, but dailyAwardCount scopes
user/rule/UTC-day. Two distinct events can both read zero and atomically commit
two awards despite cap=1. Event deduplication does not reserve the shared quota.
Real migrated service/repository diagnostic confirms `[0,0]`, AWARDED/AWARDED,
two entries/markers/matching audit/outbox records and balance 2; sequential cap
control works. No live queue/public HTTP exploit or scoring formula defect is
claimed. Owner approved a separate atomic user/rule/day fix before Phase 11.
The original audit changed no runtime behavior. The separate correction is now
in progress on `debt/d4-points-daily-cap-atomicity`: event-first then shared
user/rule/numeric-UTC-day transaction locks; eight migrated regressions pass,
including actual advisory-lock wait observation. Full API unit coverage passes
1101/1101 with all DB/Redis opt-ins. Full E2E: 479 PASS / 1 inherited DEBT-045
News failure of 480 tests, all eight cap regressions pass. Known format/audit/
GraphQL failures remain; CI/review/owner acceptance is pending. This debt is not
closed. [Proof and scope](../audits/DEBT_062_POINTS_CAP_AUDIT.md).

### DEBT-063 — Media automatic retry cannot complete from FAILED (High, OPEN, separate correction approved)

Actual built Worker processor/store with fully migrated private PostgreSQL schema
reproduces: transient transform failure records FAILED; second invocation with
successful transform cannot markReady because the update requires PROCESSING.
Processor only invokes markProcessing for QUARANTINED, and that store method
also only accepts QUARANTINED. Explicit administrative PROCESSING claim succeeds
as a control. No live BullMQ scheduling or real file-transform failure is claimed.
Diagnostic: `scripts/audit-media-retry.mjs`; details in
[Media review](../audits/D4_MEDIA_PERSISTENCE_REVIEW.md). Separate correction
approved by owner on 2026-10-18 as a separate package after the audit: agree an
atomic retry claim, preserve quarantine/terminal/deletion/manual-retry behavior,
add migrated regressions without API or timeout changes. Exact CAS boundary
subsequently confirmed. Implementation on `debt/media-automatic-retry` adds
FAILED/deletedAt-null CAS before scanning, claim-loser re-read without mutating
another attempt, terminal no-op including DELETING. Actual migrated diagnostic
passes retry, deterministic competing claims, terminal/deleted predicates,
scan quarantine and variant rollback; Worker 46 tests/coverage and lint/types pass.
This is not a global lease. Full quality gate/CI/review/owner acceptance pending;
debt remains open. [Design and evidence](DEBT_063_RETRY_DESIGN.md).

### DEBT-064 — Revoked Custom Title grant remains selected after concurrent select (Medium, OPEN, separate correction approved)

Fully migrated isolated PostgreSQL and actual repository reproduce: select's
eligible-grant query completes, revoke commits under its different grant lock,
then select commits OK and persists selection referencing revokedAt non-null.
Diagnostic query observer preserves actual results and history protections.
This is title lifecycle inconsistency, not authorization escalation. See
[Custom Titles matrix](../audits/D4_CUSTOM_TITLES_PERSISTENCE_REVIEW.md) and
`custom-title-selection-audit.e2e-spec.ts`. Separate selection/revoke/deactivate
serialization design/fix requested, preserving cooldown/history/Audit/Outbox/API.
Follow-up also confirms deactivate race with the same actual eligibility-read
barrier: title becomes inactive before select commits OK. Sequential calls deny
revoked/inactive grants (NOT_FOUND/INACTIVE), while final raced selection remains.
Two migrated diagnostic cases pass. No runtime correction in this audit.
Owner approved a separate package on 2026-10-18: shared serialization of
selection/revoke/deactivate and deterministic DB regressions, preserving cooldown,
history, Audit/Outbox and API. Finish this audit before designing the correction.
Owner subsequently approved the design direction: select retains its per-user
lock and takes a shared title lock before revalidating eligibility; deactivation
takes the matching exclusive title lock; revoke shares the per-user lock and
re-reads selection before deletion. Preserve consistent lock ordering and current
timeouts. Exact implementation and deterministic schedules remain a separate packet.
Implementation started on `debt/custom-title-selection-atomicity`: shared title
lock/revalidation for select, exclusive title update lock and per-user revoke
re-read with conditional selection deletion. Four actual DB interleavings and
three Outbox-failure rollback cases pass; 1101 API unit tests and root lint,
types/build/Prisma plus adjacent tests pass. Full E2E: 488 PASS / 1 inherited
DEBT-045 FAIL / 0 skipped of 489; seven regressions and foundation HTTP/GraphQL
pass. Draft PR #39 delivers the correction; CI/review/owner acceptance remain
pending. Known format/dependency/GraphQL drift failures are not waived.
Debt remains open.
[Design and evidence](DEBT_064_SELECTION_DESIGN.md).

### DEBT-065 — Stale Outbox dispatcher attempt overwrites recovered publication (Medium, OPEN, separate correction approved)

Actual migrated PostgreSQL/dispatcher diagnostic pauses the first queue call
after PROCESSING claim, ages its fixture lock beyond the unchanged recovery
threshold, recovers and publishes through a second actual dispatch, then releases
the first call with a synthetic queue failure. Its unconditional ID update resets
PUBLISHED to PENDING, leaving publishedAt nonnull and attempts=2. This proves
state regression, not live BullMQ delivery loss or duplicate domain effects.
Queue jobId remains stable; at-least-once and consumer idempotency are material.
Separate claim-fenced completion/failure correction requested, preserving jobId,
retries, recovery and API. No runtime correction in this audit. See
[Core Events evidence](../audits/D4_CORE_EVENTS_PERSISTENCE_REVIEW.md).
Owner approved a separate correction after this audit on 2026-10-19.
Exact claim identity/fencing design and its regression matrix remain to be agreed.
Subsequently owner approved PID+UUID per-attempt lockedBy and CAS completion/
failure on ID/PROCESSING/token. Recovery invalidates old ownership by clearing
the token. No migration, jobId/payload/retry/recovery-age/API change; no queue.add
cancellation or exactly-once claim. Implementation remains a separate package.
Audit delivered as draft PR #41: four new migrated cases pass, API unit coverage
1101/1101 and root/sibling gates pass except inherited global format/audit.
Full E2E 494 PASS/2 FAIL of 496 (known News plus recurring app timeout), no skips;
GraphQL drift remains DEBT-044. CI/review/acceptance open, correction not started.
Separate correction now implemented locally on `debt/outbox-claim-fencing`:
PID+UUID token per claim and ID/PROCESSING/token CAS for success/failure.
Ten migrated regressions pass including normal retry/jobId; root lint passes,
expanded gates pending. No migration/API/queue payload/recovery cutoff change.
Expanded eleven-case DB suite passes, including publication-persistence failure
after enqueue and unchanged current-owner retry. API coverage 1101/1101 and build
pass; final gate/serial E2E/GraphQL/publication/CI/acceptance remain pending.
Final correction delivery in draft PR #42: serial full E2E 501 PASS/2 FAIL of
503, zero skips, all eleven Core cases pass. Inherited DEBT-045 News mismatch
and recurring registration/GraphQL timeout remain; completed Jest handles
required verified PID-only cleanup after zero DB clients/fixture schemas.
GraphQL check remains red for DEBT-044; generated side effects restored exactly.
No full-green, CI/review/owner acceptance or debt closure is claimed.
Debt remains open. [Design and current evidence](DEBT_065_CLAIM_FENCING_DESIGN.md).

### DEBT-066 — Editor malformed/deep document validation throws runtime errors (Medium, ACCEPTED for separate design; exact depth approval pending)

Actual EditorService normalization of synthetic null child, object content and
object marks throws TypeError instead of controlled validation rejection. A
408108-byte valid doc-root JSON with 12000 nested blockquotes throws RangeError
before aggregate node-limit rejection. First three reproduced through current
API source and build; depth through existing build. No HTTP/process-crash or
data-disclosure claim. Shared validator's unchecked secondary traversal/marks and
unbounded recursion require a separately agreed depth policy and shared/API/HTTP
regressions; current audit changes no runtime behavior. Approval requested for a
separate pre-Phase-11 package. Existing 37 Editor unit cases pass but omit these
inputs. [Evidence and limits](../audits/D4_EDITOR_OPERATION_REVIEW.md).

Owner approved a separate correction with depth-policy design first on
2026-10-19. Runtime implementation is not started; exact depth policy remains
to be agreed before code changes.
Proposed boundary and acceptance matrix are in
[DEBT-066 design](DEBT_066_EDITOR_VALIDATION_DESIGN.md): depth 64 with doc root 0,
no content truncation, compatibility assessment before implementation. Exact
boundary approval is pending; no runtime fix is claimed.

### DEBT-067 — Wall Activity retraction before creation is lost (Medium, OPEN, separate correction approval requested)

Actual current Worker projector with migrated disposable PostgreSQL: deliver
synthetic Wall retraction at 01:01 before the older creation at 01:00. Retraction
has no existing row to update; later create inserts one active projection with
retractedAt NULL. Verified one active row, then ROLLBACK and zero owned rows.
No dev mutation, real queue reordering, post-text leak or HTTP disclosure proven.
Activity repository treats that row as a member candidate; transport maps only
IDs/action/ranking/time, not body. Separate design should preserve retraction
evidence across order/replay and retain idempotency without foreign aggregate
reads. Possible tombstone projection/migration needs approval before correction;
current audit implements nothing. See
[consumer lifecycle evidence](../audits/D4_EVENT_DATA_RETENTION_REVIEW.md).

### DEBT-069 — Shared E2E ledger fixtures contaminate Leaderboards expectations (Medium, OPEN, D6)

Date: 2026-10-20. Full E2E on a freshly migrated disposable PostgreSQL completes
505/509, including a Leaderboards first-month-page mismatch. Actual safe-field
queries identify the unexpected winner as the earlier Community Points suite's
synthetic `points-user` (created 02:31:35.439 UTC), not the current
`leader-oldest` fixture (02:31:52.478 UTC). Both have ten monthly points; the
existing SQL orders equal points by createdAt then subject ID, so the earlier
fixture legitimately wins. The points suite cleans Outbox rows but leaves its
users/ledger in the shared schema; Leaderboards assumes its own user is first.

This proves cross-suite fixture contamination of the assertion, not a production
ranking defect. The Media design-only packet changes no ranking implementation.
Proposed separate D6 correction: isolate relevant suites with the existing
migrated-schema helper and preserve global-population assertions, real ledger
effects, ranking/tie semantics and unchanged timeouts. Do not filter production
rankings by test usernames or weaken expected rank. Implementation approval and
verification of broader shared mutable fixtures remain open. Evidence:
[Media foundation](../audits/D4_MEDIA_PROFILE_ASSET_FOUNDATION.md).

### DEBT-068 — Old verification token confirms changed email (High, ACCEPTED, correction implemented; acceptance pending)

Date: 2026-10-19. Actual Auth adapters in a unique PostgreSQL schema reproduce:
issue a synthetic verification digest for the old email, run the real
`changeEmail` transaction, then consume the old digest. New email is initially
unverified with incremented authVersion, but consume returns true and sets its
verification timestamp. Worker issuance checks ID/email under lock, yet the
persisted credential is not bound to email/version and email change leaves it.

This proves destination-verification bypass, not cross-account takeover or live
HTTP/SMTP exploitation. A passing characterization pins current bad behavior.
Owner approved a separate security package before Phase 11: invalidate obsolete
verification credentials during address change, reconcile locking with Worker
issuance/consume, and add deterministic DB/HTTP regressions. Preserve public API
and existing recovery/session rules; no runtime fix is included in the audit.
[Evidence and scope](../audits/D4_AUTH_LIFECYCLE_OPERATION_REVIEW.md).

The separate correction is locally implemented: email change removes old proof
under the existing subject lock in the same transaction; password-only change
preserves it. Focused regressions pass 26/26, including real Worker issuance and
consume interleavings with observed locks. Full API1157/1157 and migrated
E2E508/509 (only inherited DEBT-045) pass the new security assertions; App27/27.
Architecture/lint/types/Prisma/build and adjacent suites pass. Format/audit,
DEBT-044 generated drift and retained handles remain red/unresolved. CI and
review acceptance remain pending; this entry is not marked resolved. See
[correction evidence](../audits/DEBT_068_VERIFICATION_DESTINATION_FIX.md).
