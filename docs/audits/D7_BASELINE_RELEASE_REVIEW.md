# D7 — Baseline release review

Date: 2026-10-22. Updated: 2026-10-26. Branch: `debt/d7-release-gate`.
Current accepted baseline: `a8c71fa391db2ca17c43a9a724e1942121d9e38c`.
Original baseline: `f118d82d62eca0f7783a79c0f624c7ee7e688c27` (accepted D6 merge PR79).
Status: **IN PROGRESS — not release acceptance or Phase11 readiness**.

## 2026-10-26 characterization acceptance override

Later runtime-verification checkpoint: PR94 exact head `17ebd01` has green CI
and strict local API623/623, build6/6, post-build2/2, but full local gate ended
exit1 at Web13/14. Hero intercepted Cancel search in the keyboard interaction.
Owner approved separate diagnostic DEBT-084 and runtime DEBT-085 after controlled
dev and fresh production reproduction. Candidate PR96 head `60105a4` has focused
unit9/9, dev15/15 and real production cancellation/focus proof; its full gate and
CI remain active. D7 inventory now has85 entries, not85 completed corrections.
No retry-to-green, force-click, timeout increase or UI redesign was used. This
supersedes any older statement implying PR94's full gate is merely pending.

Owner accepted PR93 design/characterization, merged as `a8c71fa`. Exact source
head `7a86b91` has CI5/5 and local full gate exit0, API coverage1327/1327,
E2E623/623, build6/6 and Web14/14 without retries. DEBT-079 remains open because
the ten Domain classes still depend on Nest. Separate explicitly approved
rate-limit mapping PR94 is under verification and is not accepted or merged.

DEBT-007 PR92 now includes accepted Mailpit main at integration head `b3eab76`;
its CI is green and strict E2E612/612, including both new delivery tests. The
old-head local gate terminated exit1 before browser execution with a Turbopack
startup panic. No new-head local full gate has passed; this supersedes the older
statement below that the local gate is active. No automatic gamification wiring
or historical-event policy has been approved by this checkpoint.

## Mail readiness acceptance and current candidates

Owner accepted DEBT-013 PR91 exact head `a881a1e`, merged as `0bfbe2b`.
Its CI5/5 includes actual Mailpit configuration regressions; local full gate
exit0, strict E2E610/610 and Web14/14 without retries. Eight historical SQLite
databases were preserved and integrity-checked; the one historical message was
restored through an isolated Mailpit instance before operational recovery.
Host SMTP2525, HTTP18025, synthetic delivery and persistence across restart were
verified. Primary API/Worker local SMTP fields agree; PostgreSQL/Redis were not
restarted. Earlier host-readiness failures below remain historical, not current
Mailpit failures. Preserve ignored mailbox backup copies; they are not Git assets.

DEBT-066 PR89 `b770e45` includes accepted PR81 and passed CI5/5 and local full
gate0, E2E633/633 and Web14/14. Owner acceptance was requested and is still pending;
it does not yet include the newly accepted Mailpit baseline. Do not treat older
head proofs as verification of a future integration head.

Owner approved DEBT-007 design/characterization only. PR92 `a69f9cf` contains
tests and a runtime-options inventory, not automatic gamification dispatch.
Its full local gate remains active. Runtime assembly and historical-event policy
require separate approval; no retroactive award or Phase8 acceptance is implied.
None of these checkpoints accepts D7 or starts the stack audit/Phase11.

## Accepted integration checkpoint — 2026-10-25, 19:20 UTC

This checkpoint supersedes the candidate/authority statuses in older dated
sections below, without discarding their failures or limitations.

- DEBT-040: owner accepted PR80, merged `d452cdd`; exact candidate `0c4a5c8`
  passed CI5/5 and local full gate, E2E607/607 and Web14/14 without retries.
- DEBT-082: owner accepted PR85 after integrating PR80; candidate `8cc1e50`
  passed CI5/5 and local full gate, coverage8/8 including Editor, E2E607/607,
  Web14/14 without retries. Merge `05e177d` retains both quality policies.
- DEBT-081: owner approved runtime correction and conditional integration merge.
  Candidate `29b0803` passed CI5/5 and local full gate, E2E607/607 and Web14/14
  without retries; merged `e26b0fc`. Controlled early-click red/green evidence
  supports the scoped lifecycle fix, not attribution of every historical flake.
- DEBT-057: owner accepted PR81 candidate `a554f41`, merged `746d981`.
  CI5/5, local full gate exit0, E2E610/610 in57 suites without pending/todo,
  generated-client check and build pass, Web14/14 without retries. Local report
  SHA256 `B597F19C4791A9731F14FE0DBD09AF127B60B9387E78F7343A65C5FF9176F85F`.
- DEBT-066: local statusCode400 mapping was separately approved and implemented.
  PR89 candidate `a528c90` has CI5/5, E2E630/630 without pending/todo and
  API coverage1324/1324. Its local full gate remains active on the preceding
  accepted baseline `e26b0fc`; it is not yet accepted or merged. New-main
  integration verification remains required after that process terminates.

These package acceptances do not accept D7, waive open decisions, start the
stack audit or authorize Phase11. PR87 diagnostic history remains distinct.

## Current reconciliation checkpoint — 2026-10-25

Additional bounded verification at source head `522f1fd`: four existing Jest
suites pass **47/47**, exit0: gamification module boundaries, gamification
recipient transactions, content presentation and content capabilities. The
recipient adapter forwards only an opaque ID and boolean existence; the Levels
adapter forwards only the authoritative Points balance. Errors propagate without
fallback or caching. This selected unit cohort is not a full quality gate,
HTTP/migrated-DB verification or automatic producer-to-Worker delivery proof.
It does not close DEBT-007 or, on its own, accept DEBT-003/004.

At source head `e7a57b7`, the corresponding existing migrated DB/HTTP cohort
passes **24/24 in three suites**, exit0, zero pending/todo: content boundaries
14, gamification boundaries4 and recipient transactions6. The fixture applies
the migration directory in order to a generated owned schema on disposable
DB5434; it does not clone dev data or disable immutable-history triggers.
Read-only post-run observation finds zero `api_boundary_%` schemas remaining.
Retained JSON: `node_modules/.cache/d7-composition-http-e7a57b7.json`, SHA256
`D2BD41700C315A9B950416629FF7DC1E06F551C55ED4E3E79F5FA04103B2E5DF`.
The recipient transaction tests intentionally inject a Users read failure and
assert rollback; emitted transaction-closed Prisma diagnostics during those
cases are not ignored failed assertions. Synthetic fixture accounts and direct
event invocation are not login or Worker queue delivery evidence.

A read-only TypeScript AST inventory at the same head covers **518 tracked
feature files**, excluding infrastructure, module assembly, declarations and
tests. There are zero parse errors and zero direct static imports, exports,
import-types or external import-equals targeting Prisma or core/database.
This includes legacy flat feature paths, but does not certify dynamic loading,
arbitrary aliases, transitive types or every persistence-ownership behavior.
The four gamification services consume owner-local contracts; Reputation's
account evidence is only active/createdAt, its block decision is boolean and
profile existence is ID-to-boolean. Root content presentation registers owner
capabilities without making Editor and Content Access import one another.
DEBT-003/004 remain under D7 reconciliation rather than blanket release closure.

This checkpoint supersedes mutable status statements in the historical sections
below, not their dated observations or retained failures. D7 integrates accepted
main by normal merge; its authored net diff against that main remains documentation
only. No unaccepted PR runtime is imported, no owner acceptance is inferred.

| Package             | Authoritative current scope/evidence                                                                                                                                                         | Acceptance boundary                                                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| DEBT-016 / PR84     | Owner accepted; merge089c52f. Exact candidate e62cc89 had CI5/5, local full gate0, E2E593/593, Web14/14 and high0/critical0.                                                                 | Seven blocking advisories corrected; moderate17/low2 snapshot remains, no new exception.                                              |
| DEBT-080 / PR83     | Owner accepted; mergea35326a. Exact bde1ad6 had CI5/5, local full gate0, E2E593/593, Web14/14 zero retries.                                                                                  | Test/CI-only Academy readiness correction; not a runtime fix for081/083.                                                              |
| DEBT-040 / PR80     | Head0c4a5c8: CI5/5, local full gate0, API1315/1315, E2E607/607, Web14/14; real built REST validation passes.                                                                                 | Ready for owner acceptance, not merged. Accepted main still lacks this correction.                                                    |
| DEBT-057 / PR81     | Head1343d5a: actual strict E2E596/596, main quality green, Web React no-retry failure.                                                                                                       | Unmerged and not accepted; the red083 result is not erased by historical green runs.                                                  |
| DEBT-082 / PR85     | Head16147a7: CI5/5, local full gate0, actual8/8 coverage tasks including Editor23/23.                                                                                                        | Ready but unmerged; current main runner still omits Editor coverage.                                                                  |
| DEBT-066            | Depth64/root0 approved. Local branch1e07a06: shared65/65, API Editor46/46, independent migrated host cases5/5.                                                                               | Strong HTTP assertions red on inherited GraphQL mapping. statusCode400 compatibility change requested, not authorized or implemented. |
| DEBT-081 / DEBT-083 | PR87 preserves local exit1 at77ea28d: Web13/14, React stuck step0 at5000ms, trace/screenshot retained. A controlled dev schedule independently proves timer cancellation by passive cleanup. | Research only; natural-failure cause and production impact not fully established. Runtime correction requires approval.               |

Exact-head artifacts remain in the managed checkout and corresponding PR bodies:
PR80 current CI E2E SHA256 `20C7CA7756B41F83D14ED6E0898BBE779E72A64F0D28C25DA96370C5A7A0D870`,
local `7475A51E2C5B697E03DCD939F157B8FB195DF17EE5C171119FEBBAD97FDEC65F`.
PR85 CI E2E SHA256 `1F15D6C4515E800E3F22B3EB436BA720BFA867EF69843CA22B63A8FCD02281FF`.
PR87 retained failing trace SHA256 `404A3AEE0EFD6127A53B4625E82C6F924FCBBD88454B49D91B3ACBE19DD67A93`;
controlled timer report `714D09CE3A727C6C217EB2B2CBB5BE91EA8A1A77F054A367231917C07CA8CA28`.
These distinct heads/packages are not one consolidated D7 acceptance run.

The routing matrix now includes each ID001–083 exactly once. Passport remains
excluded. Other policy/security/operational questions below remain open unless
explicitly superseded here. Mailpit recovery is still unauthorized, and no
foreign host listener or service was stopped. D7, stack audit and Phase11 are
not accepted by this checkpoint.

### Checkpoint verification and owner plan provenance

Fresh D7 security check exits0: high0/critical0, moderate17/low2. Security policy
tests pass13/13, exact braces patch verification and unchanged regressions14/14.
No dependency version, exception, runtime or test configuration is authored by D7.

Matrix verification checks all83 IDs exactly once with no missing/duplicate row.
Local file-target validation checks195 links across12 net-changed Markdown files
with no missing targets. Four external/anchor targets are excluded; existence
does not prove anchor validity or document semantics. Formatting/diff checks
pass. Helper/report: `node_modules/.cache/d7-current-links.cjs` and `.json`.
These are scoped checks, not a new consolidated D7 full gate.

Four links previously referenced the owner-only, untracked stack plan. Its
actual source is `F:/Code/dss-universe/docs/audits/STACK_AUDIT_PLAN.md` (plural
directory); the singular location does not exist in the observed primary
checkout. D7 now includes a byte-identical snapshot at the canonical relative
path, SHA256 `B1D657CFCEA43DF16636E9C79F4BB62BF4F94848B31780234C2364CBA557796A`.
Source and snapshot hashes match; the primary file remains untracked and
unmodified. No audit result files were created and the stack audit did not start.

## Approved boundary

The owner approved reviewing every debt against current code, exact regressions,
CI and explicit decisions, including architecture, migrations, secret handling
and security contracts. Deliver this report and a truthful register. Runtime/UI
corrections require separate approval. File Passport cleanup, the later stack
audit and Phase11 implementation are excluded.

D7 reuses the existing managed checkout to preserve ignored evidence, but has
its own phase branch from accepted main. The owner checkout and its untracked
`docs/audits/STACK_AUDIT_PLAN.md` remain untouched.

## Evidence baseline

- Owner explicitly accepted D6 and merged PR79. Head2287d92 has five green
  checks: Quality39791939607 and Storage39791939678. The merged tree is identical.
- Downloaded CI E2E JSON independently passes the strict no-skip policy:
  593/593 tests,55/55 suites, success=true, zero failed/pending/todo/runtime
  errors. Artifact SHA256:
  `387FA6AB489BAF42407508884DD8CB545B51CB815ADB6CE5A93B72908AD3F883`.
  Retained under `node_modules/.cache/d6-ci-2287d92` in this checkout.
- Logs confirm policy40/40, API coverage1298/1298, Web smoke14/14 without a
  flaky result, and exact owner-approved braces patch14/14. Its upstream
  advisory remains open; no new exception or vulnerability erasure is claimed.
- One consolidated local `quality:full` passes at source2837644; the D6 report
  preserves exact command/report boundaries, cleanup and earlier failures.
- Main post-merge Quality39794929146 and Storage39794929163 both succeed at the
  baseline, including all five terminal jobs. Their results are distinct from
  the pre-merge PR checks.
- Main E2E artifact independently passes the same strict policy: 593/593 tests
  in 55 suites, no skipped/todo/runtime errors. Retained in
  `node_modules/.cache/d7-main-f118d82`; SHA256:
  `F8C9EBDED392DC66DA14C6B61531D4841762596EFEE909CD146301035AB607DF`.
- A fresh D7 `quality:full` attempt at source57db97e terminates at the security
  step with exit1; details below. Passing steps prove their covered behavior,
  not all ownership rules, all untrusted inputs or all79 debt dispositions.

## Decision checkpoint — not release acceptance

At remote revalidation, main remains f118d82 and the D7 branch contains only
documentation changes. No D7 PR/merge is claimed. Do not trigger another known-red
full run merely to repeat the unchanged dependency result. Fresh scoped DB and
Media evidence above/below does not remove these release decisions.

| Item                            | Next bounded action                                                                               | Authority / limit                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 016 Next security               | Separate controlled dependency patch and complete gate/CI.                                        | Approval requested again at this consolidated checkpoint; not implemented.                |
| 013 host mail                   | Establish host-port cause, then Mailpit-only recovery and protocol verification.                  | Separate approval requested; preserve data, DB/Redis, foreign processes and volumes.      |
| 057 News tombstone              | Design nullable SDL/generated-client compatibility, then separate HTTP-backed correction.         | Owner approved this sequence; no implementation in D7.                                    |
| 066 malformed Editor            | Agree an explicit depth/shape compatibility boundary, then controlled rejection/HTTP regressions. | Package approved; exact depth64/root0 not approved.                                       |
| 007 gamification delivery       | Owner-safe consumer/replay design with actual producer-to-ledger acceptance.                      | Existing missing integration, not cured by foundation tests; no speculative queue wiring. |
| 037 physical storage            | Decide trusted local writers versus hostile-writer hardening before selecting mechanism.          | No inferred threat-model waiver.                                                          |
| 047 administrative availability | Minimal current-capability policy design or explicit deferral.                                    | Future unique-owner/Command Deck features are not implemented early.                      |
| 067 Activity ordering           | Durable retraction-before-create design before schema/runtime change.                             | Current UPDATE-only projection remains unresolved.                                        |
| 079 Domain/HTTP                 | Error-to-transport preserving boundary design.                                                    | Separate correction scope, not silently folded into D7.                                   |
| 039 naming/product orientation  | Reconcile canonical sources to owner naming and Research Lab/Knowledge Forge scope.               | Existing owner override retained; no route/phase renumbering inferred.                    |
| 040/058/059 and remaining M     | Finish bounded transport/stability and semantic dispositions, preserving unknown causes.          | Green tests are not an undocumented waiver or universal proof.                            |

This is a dependency/decision queue, not a claim that only the first two items
remain. Passport work and approved LOCAL/Search deferrals retain their separate
status. Stack audit and Phase11 brainstorming remain downstream of D7 acceptance.

## Architecture basis

Read [architecture rules](../architecture/ARCHITECTURE_RULES.md),
[Core foundation](../architecture/CORE_ARCHITECTURE.md),
[tooling contract](../architecture/ARCHITECTURE_TOOLING.md),
[ADR003](../architecture/adr/003-subject-and-access-ownership.md) and
[ADR004](../architecture/adr/004-module-integration-contracts.md).

Auth owns subjects/credentials/sessions; Users profiles; IAM assignments;
Authorization effective decisions. Root composition coordinates narrow owned
contracts. Infrastructure-only transaction entries do not permit business ORM
leaks or foreign feature dependencies. Symbols remain named; DTOs contain DTOs.

Historical D2 report-only/pending descriptions are not current release evidence.
D4.5 promoted the frozen inventory check into the mandatory command, but zero
AST findings do not prove full runtime, secret or semantic ownership compliance.
Reconcile historical/current descriptions without silently changing an ADR.

## Inventory and method

All 78 original IDs DEBT-001 through DEBT-078 are present, with no missing IDs.
D7 additionally records DEBT-079, bringing the current inventory to 79 entries.
This is an identifier inventory, **not 79 completed reviews**. The
[individual review routing matrix](D7_DEBT_DISPOSITION_MATRIX.md) covers each ID
exactly once and makes remaining source/decision work explicit. For each entry map
its original scope, approved decision, current source, specific regression,
migration/API implications, fresh evidence and disposition. Preserve old
diagnostics; do not close OPEN entries merely because D6 is green.

### Initial triage — not the final 79-entry matrix

| Entries     | Finding                                                                                                          | Initial disposition                                                      |
| ----------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 009,019     | Owner removed Passport cleanup from D5 and assigned it to a later workstream; no new scan/classification here.   | DEFERRED outside D7; old counts are not current findings.                |
| 015,075–078 | Accepted D6 contracts have source, regressions, consolidated local gate and new-head CI evidence.                | RESOLVED for scoped D6 delivery, not whole-product acceptance.           |
| 049         | D6 preserves historical SQL/migrations while aligning defaults/native UUID/index annotations and checking drift. | Accepted D6 evidence; detailed D7 migration review still required.       |
| 040         | Source imports all three REST body DTOs as types; compiled metadata uses Function, not DTO constructors.         | OPEN current validation-contract finding; no exploit claim.              |
| 066         | Current shared validation throws on malformed containers/deep nesting; proposed depth64 is not approved.         | OPEN current behavior; separate policy/correction required.              |
| 047         | The six-key proposal was superseded by owner product decisions, not by an implemented availability guarantee.    | Revalidation/disposition needed; no early owner features.                |
| 067         | Wall retraction ordering correction was requested; current ordering is not yet revalidated in D7.                | Review/decision pending, not silently closed/deferred.                   |
| 079         | Ten feature-domain exceptions directly import/inherit Nest HTTP transport; unchanged in D6.                      | OPEN architectural dependency; no exploit or transport-regression claim. |

## Confirmed current checks

### DEBT-040 — REST DTO constructor metadata

`apps/api/src/composition/identity/presentation/authentication.controller.ts`
still uses type-only LoginDto/RefreshTokenDto/RegisterDto imports. The actual D6
build in `apps/api/dist/src/composition/identity/presentation/` contains
design:paramtypes `[Function,Object]` for register/login and `[Function]` for
refresh. Application source is unchanged at accepted main: missing DTO
constructor metadata is not merely stale paperwork.

No live endpoint/invalid account write was exercised. Establish required/optional
field compatibility and service-level validation before a separate correction;
do not silently change displayName requirements or claim a proven HTTP exploit.

### DEBT-066 — current shared validator

Synthetic in-process calls through the current built Editor package reproduce:

| Input                                                                     | Result     |
| ------------------------------------------------------------------------- | ---------- |
| Null child in doc content                                                 | TypeError  |
| Object instead of content array                                           | TypeError  |
| Object instead of text marks array                                        | TypeError  |
| 12000 blockquotes plus paragraph/text; deepest node12002;420133-byte JSON | RangeError |

`packages/editor/src/validation.ts` still runs unchecked secondary traversal and
recursive child visitation; aggregate node limits are checked afterward. The
probe builds JSON fragments without recursive stringify. No private body, HTTP
request or DB mutation is involved. This is controlled service-level evidence,
not proof of a process crash, disclosure or denial-of-service exploit. The
proposed depth64/root0 remains an unapproved compatibility tightening.

### DEBT-001/002/027 — initial boundary inspection, not closure

Auth publishes explicit contract tokens/types instead of its concrete service.
AuthenticationFlows returns opaque subjectId and explicit tokens; private
AccountCredentials contains a password hash but no profile fields. Identity
composition assembles an explicit profile/token allowlist through separate
Auth and Users ports, without ORM access in the composition use case.

The first textual scan incorrectly assumed top-level IAM application/domain
folders; IAM has multiple owned subfeatures. Those missing-path diagnostics are
not an empty/successful whole-IAM review. Continue with actual subfeature paths,
provider wiring, indirect exports and exact regression mapping before closing
these broader entries. Auth's contract exports alone do not prove every command,
secret sink or runtime dependency correct.

### DEBT-079 — inherited Domain/HTTP coupling

Current source inspection finds four Auth, one Users and five Media domain
exceptions coupled to Nest HTTP. Exact files, rule, evidence and proposed
separate scope are in [DEBT-079](DEBT_079_DOMAIN_HTTP_COUPLING.md). This demonstrates
a limitation already stated in the architecture inventory, not permission to
waive Domain independence. No error implementation or response is changed.

### Identity/IAM evidence checkpoint — 2026-10-23

Source is still the accepted baseline; only D7 documentation differs. Inspected
AuthModule and IamModule provider bindings and exports, the two public roots,
Auth credential orchestration, IAM role/permission/assignment/group services,
request session validation, request access composition and registration unit of
work. IAM's legacy-named `subject-access.service.spec.ts` actually exercises
`UserAccessService`; there is no separate `subject-access.service.ts`. A missing
path is not evidence that a service was removed or that its policy is absent.

| Debt | Current source and evidence                                                                                                                                                                                                                                                                                        | Remaining acceptance boundary                                                                                                                                                                                                                   |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 001  | AuthService uses its own credential repository; enrollment receives a write-only subject store. Root AuthenticationPresentationService binds Users profile input and allowlists the response. Root PrismaRegistrationTransaction combines disjoint owner fragments and IAM baseline assignment in one transaction. | Original direct Users repository/mapper coupling is not present in these inspected paths. Reconcile all lifecycle consumers and real DB rollback evidence before closing the broad entry. Owner availability remains separately tracked as 047. |
| 002  | Auth application and actual IAM service subfeatures use owned repository/capability contracts. The focused ORM scan returns only comments, not Prisma imports/client calls in these paths. Module assembly binds infrastructure implementations privately.                                                         | This supports implemented removal of the original direct-Prisma service coupling, not framework-free Domain compliance (079), all repository ownership, or whole-module security acceptance.                                                    |
| 027  | Auth/IAM roots publish named tokens/types; Nest module exports expose four narrow contracts each, not application services/repositories. IAM metadata regression pins its exact exports.                                                                                                                           | Other feature roots and technical-entry consumers still require individual review; no whole-repository public-surface closure.                                                                                                                  |
| 022  | Current whole-repository `format:check` exits0, unlike the historical 41-file diagnostic. Accepted D6 full gate also passed.                                                                                                                                                                                       | The original formatting count is stale, not a live failure. This is scoped Prettier evidence, not File Passport review or semantic code-style certification.                                                                                    |

Fresh focused unit verification (not a new full profile):

- Ten explicit suites: 78/78 passed, exit0. Includes access-session validation,
  JWT strategy, authoritative request access reader, authentication presentation,
  IAM module boundary, roles, permissions, two assignment suites and IAM safety.
- Three additional explicit suites: 47/47 passed, exit0. Includes AuthService,
  registration transaction unit contract and access-group application policy.
  JSON retained at `node_modules/.cache/d7-identity-unit-review.json`.
- These are 125 tests in 13 distinct suites, not 125 DB/HTTP regressions. No
  integration suite was selected and no disposable database migration was run.

Reviewed assertions cover session subject/version/revocation/expiry checks,
fresh access instead of stale token grants, denial on authority failures,
profile/token allowlists even for an overbroad provider, registration failure
ordering, disjoint credential/profile fragments, IAM output allowlists and
Premium rejection of delegated capabilities. Mocked transaction propagation
does not prove PostgreSQL rollback: the separate opt-in registration integration
suite uses an isolated schema and must be mapped to full-profile evidence.
No historical test filename or green unit count substitutes for that proof.

### DEBT-049 — migration-history reconciliation checkpoint

Read [the schema alignment evidence](DEBT_049_PRISMA_SCHEMA_ALIGNMENT.md) and
compared accepted D5 `fcab53c` with accepted D6 `f118d82`. Under `apps/api/prisma`
the only changed tracked file is `schema.prisma`; the migration-history diff
exits0 and the current directory contains 54 migration directories. This proves
no D6 rewrite/addition in that history, not that every historical migration is
safe for every production dataset.

The exact model diff adds twelve `@default(now())` while retaining `@updatedAt`,
Outbox ID `@db.Uuid`, and the two named Users indexes. Current migration SQL
already declares the twelve timestamp defaults, native UUID and these index
names; the alignment does not introduce a new SQL operation. The historical
Outbox migration also explicitly has its own nondefault `updatedAt`; it is not
one of the twelve changed fields.

The existing D6 report separately records migrated DB catalog/default/create/
update checks and empty read-only drift before/after tests. Those are retained
D6 evidence, not a fresh D7 DB test. Its old CI-pending statements describe that
checkpoint; the final accepted D6/head and main CI evidence above supersedes
them without rewriting the historical failures. D7 has not yet rerun live drift.

Fresh static schema-contract verification passes 14/14 in one suite, exit0;
JSON is retained at `node_modules/.cache/d7-schema-contract-review.json`.
It checks model source contracts, not a live catalog or production migration.

Canonical `apps/api/src/schema.gql` still has SHA256
`C03170CB54027C557F662A5B9BF5F85CAFA2112B8623D3FCA360E8FA9C82FD2C`.
This checksum verifies no SDL change here, not API behavioral equivalence.

## Remaining streams

### Refreshed001/002/027 source-to-regression reconciliation — 2026-10-25

Source point358f2d7 integrates accepted maina35326a. A Git comparison finds no
changes in API source, Worker source or shared Editor source relative to accepted
D6f118d82; dependency and smoke changes retain their separate accepted history.
This continuity supports reuse of explicitly mapped source evidence, not all
historical test outcomes or a universal behavior guarantee under new dependencies.

The original001 finding concerned Auth importing Users repository/mapper internals
and owning profile lifecycle. Current private AccountCredentials and repository
contract contain credential/eligibility fields only; the Auth root publishes
opaque contracts. Auth production profile-name matches are absent; README
mentions Users only in the external root-composition diagram. Root
AuthenticationPresentationService registers via a write-only credential store
bound to Users-owned profile data, then explicitly allowlists profile and token
responses. Account state commands remain Auth-owned under the approved subject
boundary; last-administrator availability047 is not solved by this separation.

For002, actual IAM services are user-access, safety, permissions, roles and
access-groups. The first four use legacy paths outside application directories;
the final source scan explicitly includes all five, rather than treating an
empty application-only glob as whole-IAM evidence. Direct ORM patterns are
absent there and in Auth application. IAM module assembly and infrastructure
entry points legitimately import Prisma adapters and are not business-service
violations. This does not waive Domain/Nest coupling079.

For027, a literal TypeScript AST sweep covers16 feature-root index files with122
export declarations (168 type-only symbols,100 value symbols), no parse errors,
no wildcard/namespace exports and no direct application/infrastructure or flat
service/repository/mapper value re-exports. It is a direct-root inventory, not
proof about arbitrary transitive/dynamic modules. Auth/IAM module metadata exports
four narrow capability tokens each. The selected metadata regressions additionally
cover IAM and three other feature surfaces while retaining private providers.

Fresh existing regressions pass **152/152 in17 suites**, with no pending/todo:
Auth flows/session/token validation, credential allowlists, root presentation,
legacy claims/current request access, IAM services and public surfaces. The
registration PostgreSQL subset passes8/8 with RUN*AUTH_DB_TESTS enabled on5434.
It uses owned schema tables cloned from migrated public definitions and injected
failure triggers: this is real transaction/rollback evidence, not a full AppModule
HTTP test or a new full-migration run. Audit, issuance and delivery doubles make
failure ordering observable; they do not prove actual SMTP or Audit transport.
Afterward a read-only schema count finds zero registration*\* schemas.

Report: `node_modules/.cache/d7-identity-reconciliation-358f2d7.json`, SHA256
`87609F0684DF248B66BC7A38BEFDCBCCAF5AA087B88636B6B0535296BB7D547E`.
Log: `TEMP/dss-d7-identity-reconciliation-358f2d7.log`.
AST helper/report: `node_modules/.cache/d7-public-root-inventory.cjs` and `.json`.
Fresh architecture command passes140/140 and frozen inventory0 findings; log
`TEMP/dss-d7-architecture-358f2d7.log`. It explicitly is not a compliance certificate.

The register now records these three original technical corrections as IMPLEMENTED,
not RESOLVED. Global/semantic residuals and final D7 owner acceptance remain open;
no runtime, tests, schema, policy or provider export was changed by this review.

### Fresh dependency-security gate — BLOCKED (2026-10-23)

`pnpm security:check` naturally exits1 on current accepted dependency baseline.
Retained raw log: `dss-d7-security-check.log` in the local temporary directory.
Log SHA256: `BF7278FFA2AF464ECBCB55E3FC7D13B2FB2C2E4E841C831840C3AC32B124A99D`.
Registry report: zero low/info, 12 moderate, two high, two critical. The precise
braces exception still passes exact patch/installed-file verification and all
14 regressions; independent policy tests pass 9/9. No exception was added.

| Package / installed version | Advisory                                                                 | Reported severity | Patched release |
| --------------------------- | ------------------------------------------------------------------------ | ----------------- | --------------- |
| next 16.3.8                 | [GHSA-2464-fhr4-w9xw](https://github.com/advisories/GHSA-2464-fhr4-w9xw) | Critical          | 16.4.1          |
| next 16.3.8                 | [GHSA-p3m5-59mp-jv5r](https://github.com/advisories/GHSA-p3m5-59mp-jv5r) | High              | 16.4.1          |
| next 16.3.8                 | [GHSA-673q-mjm6-r5xr](https://github.com/advisories/GHSA-673q-mjm6-r5xr) | Critical          | 16.4.1          |

Opened the three primary GitHub advisories and independently queried npm package
metadata: next and eslint-config-next 16.4.1 exist; Next requires Node >=20.9.0,
compatible with the approved Node24 baseline. Actual installed next and
eslint-config-next are both16.3.8. npm audit paths include direct Web Next and
Apollo Next integration. The affected-version finding is verified; exploitation
of DSS is not. SVG optimization impact has upstream-library/platform conditions;
the cache advisory describes typed-array-returning `use cache` functions. A
bounded configuration/source grep did not find the selected feature strings,
but does not prove transitive/deployment immunity or justify a new exception.

This refreshes existing DEBT-016, not a duplicate new debt. Old green D6 audit
results remain accurate historical evidence, not current security acceptance.
D7 cannot be accepted as a green release gate while these findings block.
Asked owner for a separate correction packet (Next/config16.4.1, controlled
lockfile delta, full quality/security/CI, no UI/UX change). Approval is pending;
D7 itself has no dependency/runtime changes. No exploit probe or live deployment
test was performed, and no broad stack change is proposed.

### News/Editor and Media/Outbox checkpoint — 2026-10-23

The following maps current implementations to the original narrow defect, not
to future category/group ACL, complete Media Platform or whole-product security.

| Debt | Inspected current behavior                                                                                                                                                                                                                                                 | Exact main CI E2E evidence                                                               |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 051  | Attachment projection unwraps canonical NEWS/doc and skips every contentGate subtree; metadata comes through an owned reader.                                                                                                                                              | `news-attachment-contracts`: 29/29.                                                      |
| 052  | Full News asks Editor for viewer-safe JSON before attachment projection. Root adapter returns only projected JSON; no raw-document fallback on provider failure.                                                                                                           | `news-viewer-redaction`: 20/20.                                                          |
| 053  | Public text evidence excludes denied gates; authenticated gated documents are projected in batches of 64. Matching relation is built before pins/count/page, with no result cap. Missing/stale projection or policy failure rejects rather than returning partial results. | `news-search-query`: 11/11; performance suite still needs separate mapping.              |
| 054  | Related-link query applies current article eligibility to its target before returning metadata and preserves configured ordering.                                                                                                                                          | `news-related-audience`: 12/12.                                                          |
| 056  | Root read unit asks News eligibleTarget before Interactions reads. Inaccessible pages return empty items and zero totals, with the requested page coordinates.                                                                                                             | `news-secondary-audience`: 21/21.                                                        |
| 071  | News consumes explicit GUEST/AUTHENTICATED context, denies invalid contexts, and checks publication/audience/flags. Tests cover guest, invalid/revoked/expired credentials and disabled accounts, with no denied counter writes.                                           | `news-interaction-audience-characterization`: 31/31.                                     |
| 065  | Dispatcher uses PID+UUID per claim and ID/PROCESSING/token CAS on both success and failure; recovery clears ownership.                                                                                                                                                     | `core-outbox-audit`: 11/11, actual PostgreSQL with controlled queue double.              |
| 072  | Media assignment performs its owned conditional physical UPDATE without timestamp mutation. Root cleanup retains Serializable and defers the rolled-back batch only for known P2034.                                                                                       | `media-profile-cleanup-claim-audit`: 12/12; `media-profile-serialization-design`: 19/19. |

These exact suite counts were extracted from the retained, hash-identified main
artifact above, not rerun as HTTP/DB cases during this checkpoint. Each matched
one suite with all assertions passed. Six News suites total 124 tests; the
Outbox/Media entries are separate, not additional proof of unseen scenarios.

Fresh focused tests also pass:

- News/Editor: 112/112, seven explicit unit suites, zero failed/pending/todo.
  JSON: `node_modules/.cache/d7-news-editor-unit-review.json`.
- Worker: 21/21 in three explicit test files, zero failed/pending/todo. JSON:
  `node_modules/.cache/d7-worker-unit-review.json`. This covers Media processing
  orchestration and integration-event consumer/processor contracts, not live
  PostgreSQL or BullMQ delivery.

DEBT-063's implemented FAILED retry CAS occurs before scan/transform; a claim
loser re-reads terminal state and otherwise fails outside the attempt catch, so
it does not mark the winner FAILED. This remains the owner-approved narrow state
CAS, not an exclusive whole-attempt lease. The actual SQL claim and migrated
retry diagnostic need final evidence reconciliation before closing that entry.

Consumer identity remains `dss.worker.integration-events.v1`; processor imports
the Worker-owned constant. The focused test result is not proof of full live
DLQ retry/history compatibility (061). Likewise Outbox fencing does not cancel
late queue.add or promise exactly-once effects. Fresh access before a separate
statistics transaction retains the explicitly approved 071 race boundary.
No stronger atomic access guarantee is claimed.

The Editor malformed/deep-input defect (066) remains open independently of
passing redaction/search tests. Wall retraction ordering (067), Media physical
containment (037), search performance and all remaining individual debt
dispositions are still review work, not silently accepted risks.

### Open-risk revalidation and decision queue — 2026-10-23

| Debt | Current evidence                                                                                                                                                                                                                                                                                                                                          | Disposition at this checkpoint                                                                                                                                                                                                         |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 037  | Shared resolveStorageKey uses native resolve/relative after portable key validation; neither helper performs filesystem IO, realpath checks or handle-based containment.                                                                                                                                                                                  | OPEN threat-model decision. Asked owner whether uploads remain trusted/application-controlled or hostile local writers require pre-11 hardening. No inferred waiver.                                                                   |
| 047  | Auth deactivateAccount updates ACTIVE subject eligibility and revokes sessions in its own transaction. IAM role revocation locks the role but counts all assignments without an ACTIVE filter. Permission repository update/delete and role-permission delete have no shared availability predicate; PermissionsGuard checks actual keys, not role names. | OPEN current source-level availability risk, not a reproduced total lockout. Asked for separate minimal pre-11 policy design versus explicit deferral. Future unique-owner requirements remain scheduled, not prematurely implemented. |
| 067  | Current PostgresActivityProjector retraction is UPDATE-only by subject; create inserts with conflict handling only on sourceEventId. There is no persisted retraction when no create row exists.                                                                                                                                                          | OPEN ordering risk still consistent with the earlier migrated reproduction. Asked for separate durable ordering/tombstone design; schema/runtime implementation remains separately gated.                                              |

Fresh pure tests pass: Storage 43/43 and Activity projector 3/3, no failed,
pending or todo results. JSON retained at `node_modules/.cache/d7-storage-review.json`
and `node_modules/.cache/d7-activity-projector-review.json`. Storage tests cover
lexical key/path behavior, not hostile symlink/junction races. Activity's mocked
query tests inspect allowlisted event values and update SQL, not durable
retract-before-create behavior. Their passing status does not close 037 or 067.

No filesystem link attack, privileged-account mutation, real queue reordering,
production lockout or new DB reproduction was attempted in this checkpoint.
The three owner questions are pending; review of other entries remains possible.

### Scoped registry closure reconciliation

DEBT-044, 049 and 055 are now RESOLVED for their original accepted correction
scopes, with explicit D7 reconciliation notes before the retained historical
diagnostics. This is not blanket D7 acceptance. For 044, D6's generator baseline
repair, consolidated clean regeneration and terminal CI prove the drift fix;
not every generated export is thereby architecture-certified. For 049, the
history/model inspection and fresh 14-test source contract complement accepted
D6 drift/catalog/CRUD evidence. For 055, the current package command and fresh
post-build entry check pass 1/1; actual HTTP readiness remains the separately
recorded D6 production-mode smoke, not a fresh D7 server startup.

### Points / title / email / social checkpoint — 2026-10-23

| Debt | Current implementation and reviewed invariant                                                                                                                                                                                                                             | Evidence and limits                                                                                                                                                                                                                                                                            |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 062  | Award takes the event lock before the shared user/rule/UTC-day lock, then counts and inserts ledger/marker/evidence in the same transaction. Unlimited rules do not acquire the quota lock.                                                                               | Main CI `community-points-cap-audit`: 8/8. Reviewed deterministic final-slot test observes PostgreSQL lock waiting, then counts [0,1] and AWARDED/CAPPED outcomes; suite also covers duplicate delivery, day separation and rollback. No fresh DB run here.                                    |
| 064  | Selection retains user lock, takes shared title lock and rereads grant/current/settings. Revoke takes the same user lock and rereads selection; definition update takes exclusive title lock before removing selections.                                                  | Main CI `custom-title-selection-audit`: 7/7, including both operation orders for revoke/deactivate and three evidence-failure rollback cases. Source review confirms the lock coordinate matches. Not a global title lock or complete proof of all future commands.                            |
| 068  | Email change updates the subject, invalidates all old verification proof, revokes sessions and audits in one transaction. Consume locks that subject then conditionally deletes the exact unexpired proof; Worker issuance locks the subject only for its expected email. | Main CI contains the exact passed HTTP test `rejects old email proof after HTTP email change and accepts fresh destination proof`. Opt-in repository suite source additionally covers two lock orders, issuance ordering and rollback; not freshly selected without its disposable-DB profile. |
| 070  | Followers/following and blocked-user pages call the same Users viewer-safe batch projection, map by ID and restore edge order. Missing privacy evidence throws instead of returning an unredacted profile.                                                                | Main CI `users-social-privacy-characterization`: 6/6, covering all three page kinds, owner visibility, privacy failure and the stabilized asynchronous-presence assertion. No current HTTP replay in D7.                                                                                       |

Fresh pure unit selection passes 24/24 in three distinct suites, with no pending,
todo or runtime errors. JSON: `node_modules/.cache/d7-account-social-title-unit-review.json`.
Selected account credential repository (mocked transaction), social graph
service and Custom Titles application service; this is not a replacement for
DB lock/rollback or HTTP tests. Main CI suite counts above are independently
extracted from the retained accepted-main JSON, not inferred from file names.

These corrections are present in current source; their old OPEN/approval-only
labels must not be mistaken for absent runtime implementations. Final D7
acceptance, broader source/contract reconciliation and the current dependency
security blocker remain separate. No rating formula, API, timeout or schema
change was made for this checkpoint.

### Factor / revocation / CI reconciliation — 2026-10-23

For042, inspected actual begin/confirm/disable/recovery persistence: the subject
row is locked before reading a possibly absent factor; proof and disable,
session revocation, authVersion and audit share the transaction. Reviewed opt-in
PostgreSQL suite assertions cover first setup, password-change wait, competing
disable/confirm/recovery and rollback. Those tests were not selected without
their disposable-DB profile in this checkpoint; source existence is not a fresh
DB pass. No recovery secret enters the inspected audit payloads.

For043, current JWT strategy validates session first, then reads current access
and constructs copied permissions/roles rather than trusting JWT grant claims.
The exact accepted-main HTTP case `honors direct revoke, grant, key rename and
permission deletion with the same JWT` passes; source assertions exercise
200/403 transitions with an unchanged token, not just refreshed login.

For046, current role-revocation writer locks the role, reads/counts assignments,
evaluates the pure safety callback and deletes in one transaction. Reviewed
PostgreSQL tests observe two blocked revocations, require one success/one denial
and one remaining assignment for each protected role. Main HTTP/composition case
`retains last-admin policy rejection under the real role lock` passes. This is
assignment safety only, not the ACTIVE/permission-coverage policy missing in047.

Fresh four-suite TOTP/2FA/JWT/request-access unit selection:24/24, no failed,
pending or todo; JSON `node_modules/.cache/d7-session-factor-unit-review.json`.
Fresh Web lifecycle selection:1/1, no pending/todo; JSON
`node_modules/.cache/d7-web-lifecycle-review.json`. Neither result is a fresh
concurrency DB, full coverage or live-browser gate.

Scoped register reconciliation now marks034,038,041,050 RESOLVED for accepted
D6 smoke journey, bounded CI workflow, decoded-byte tamper-test and teardown
corrections respectively. Each entry retains its historical failure and states
the scope limit. DEBT-058/059 remain separate intermittent observations: passing
later gates alone does not establish their original root cause. Current Next
security failure also remains blocking despite these historical corrections.

### Canonical orientation / documentation reconciliation — 2026-10-23

Read D1 scope decisions and reconciliation report, the current owner vision
intro, plan authority/entry rules, canonical-roadmap precedence note and the
entire Project Context snapshot. The snapshot still selected DEBT-051 as active,
mixed historical red gates into present quality statements and scheduled D5
Passports. This is current documentation drift within existing006/011/025/039,
not evidence that the accepted runtime regressed to its old branch.

Project Context now begins with accepted main and active D7, current Next audit
failure, deferred Passport scope and the stack-audit/brainstorm fences. Old
checkpoints are retained under an explicit historical boundary. The module
description now reflects one product rather than separate products; current
IAM foundation is distinguished from future resource ACL and owner features.
Plan authority now records accepted D6 and the explicitly approved D7 scope.
Remote main and PR79 merged state were checked again before these updates.

For010/028, inspected legacy `docs/architecture/backend.md` and
`standards/backend.md` precedence warnings: they redirect to current layered
rules, not active authority for role-only checks or service-owned Prisma. ADR003/
004 and Architecture Rules remain authoritative. This review did not certify
every old draft/example or rewrite embedded standards/Passport templates.

Canonical roadmap itself still contains reversed historical Mission Control /
Command Deck labels despite its top-level owner override. Research Lab versus
Knowledge Forge still needs the explicit product/phase reconciliation already
tracked as039. No route/module rename, phase renumbering or feature scope change
was made. Therefore039 and broad canonical-documentation acceptance are not
closed solely by fixing the orientation snapshot.

### D0 operational revalidation — 2026-10-23

Fresh read-only runtime checks: Node24.18.0, pnpm11.9.0 and Docker client/server
29.8.2 respond. GitHub CLI reports authenticated repository-capable account;
tokens/credentials were not printed beyond CLI's masked status. Dev PostgreSQL
5433/Redis6379 and disposable5434/5435/6380 containers report healthy. ClamAV
container reports healthy and host3310 accepts TCP; no scan/processing or full
antivirus-delivery acceptance is claimed. Optional OTLP collector is not running
and host4318 is unavailable; this remains the approved optional profile, not an
unexpected mandatory-service failure. No service was started or stopped.

Mailpit is running/healthy internally but host readiness is not established:

- HostConfig declares loopback1025/8025 bindings, while current NetworkSettings
  reports empty mappings for both container ports.
- Host8025 TCP fails; HTTP `/readyz` is unavailable with a3s bound and no host8025
  listener is found.
- Host1025 TCP connects, but does not return an SMTP220 greeting within2s. A host
  listener PID1432 exists on wildcard addresses; its identity/cause is not proved
  to be Mailpit or Docker. No process was killed or mail sent.
- Container `/mailpit readyz` invocation completes and State remains healthy.
  Internal health and host protocol readiness are distinct evidence boundaries.

This reopens current host-mail readiness under existing013; it is not a new
duplicate defect, a proved WSL cause or permission to recreate containers in
the review packet. Earlier D0 delivery results remain historical. LOCAL storage
and absent MinIO/S3 parity retain explicit017 deferral. Source/container metadata
alone does not prove current env alignment, SMTP delivery or telemetry export.

Inspected API/Worker validation contracts without reading/printing local env
values. Required JWT inputs and production Media/2FA secrets are explicit; Worker
rejects missing/non-PostgreSQL DB input and incomplete configured mail endpoints.
Fresh pure tests: API config6/6 and Worker environment5/5, zero pending/todo,
JSON `node_modules/.cache/d7-config-review.json` and
`node_modules/.cache/d7-worker-environment-review.json`. Bootstrap was inspected
in part, not executed; no migrations/seed/env writes occurred. These tests do
not certify every local secret, all production configuration or bootstrapping.

### Individual inventory / tombstone / leaderboard checkpoint

The new [routing matrix](D7_DEBT_DISPOSITION_MATRIX.md) independently verifies
79 unique rows with no missing IDs. Categories describe review completeness,
not automatic register closure. Its R entries are explicit next source/test
work, and M entries retain their stated acceptance limits.

For057, current NewsCommentItem permits nullable body/documentJson; presentation
NewsCommentModel still declares required body. An in-memory GraphQL execution
against the actual canonical SDL, with a synthetic tombstone root value, returns
`Cannot return null for non-nullable field NewsComment.body` at
`newsComments.items.0.body` and null data. This is current schema-serialization
evidence, not a fresh HTTP/DB reproduction or deleted-content disclosure. The
first shell probe had a quoting SyntaxError before execution; only the corrected
probe establishes the result. Asked for a separate nullable-tombstone/client
compatibility design and correction packet; no API/schema/UI change in D7.

For060, inspected Leaderboards-owned population LEFT JOIN and root one-query
reader: population total is independent of requested page rows, and root removes
the technical null page row before allowlisted mapping. Accepted-main ownership
E2E is30/30, including17 explicit DEBT-060 cases for missing/deactivated/banned/
deleted viewers, all periods, empty populations and fresh subsequent counts.
This maps the approved correction without adding an independent count query,
changing rank order or claiming unauthenticated HTTP behavior. Not rerun as DB
tests in this checkpoint; current dependency acceptance remains blocked.

### Full-profile / fixtures / portable IO reconciliation

Fresh `pnpm test:full-policy` exits0:40/40, zero skipped/todo. Read the full
environment/result policy, full-test wrapper, actual Jest negative-control test,
Turbo task definitions, dry-run/hash assertions and isolated-schema fixture.
The wrapper injects four DB/Redis opt-ins, uses strict env, force/no restored
results and concurrency1. Each API task hashes relevant env plus the external
result-policy source; actual Turbo dry runs prove changed keys change hashes.
Actual child Jest with a skipped mandatory test exits1, while its complete
control exits0. This is executable gate-policy evidence, not a new full API/DB
run. Log: `dss-d7-full-policy-review.log` in local temp.

For021, inspected shared upstream build ordering on test/lint/typecheck and
the full wrapper; accepted D6 fresh tasks/CI complement current dry-run controls.
For045/069, News and Leaderboards override Prisma with distinct owned migrated
schemas and close app/fixture in finally. The fixture enforces loopback dss_test,
unique schema/search_path and rejects public-qualified migration DDL. News
preserves actual persisted views0-to1; Leaderboards preserves global population,
tie order and inactive exclusion rather than filtering production rankings.
Exact main foundation suites each pass their full workflow case. No new DB
execution or blanket fixture-cleanup fault tolerance claim is made here.

For020, inspected API LocalStorageProvider and both Worker consumers: common
portable normalization/resolution, API pre-IO checks, all Worker variant keys
before filesystem effects and scan-path resolution before opening TCP. For023,
actual test metadata uses Sharp over readFile bytes, verifies source removal
and leaves production Sharp caching unchanged. Fresh API storage15/15 and the
two Worker storage/scanner suites pass without pending/todo; JSON retained at
`node_modules/.cache/d7-api-storage-review.json` and
`node_modules/.cache/d7-worker-storage-review.json`. Existing accepted-main
Windows/Linux containment jobs provide the cross-OS evidence; this checkpoint
does not rerun Linux. Physical hostile-writer containment remains037.

Registry/routing reconciliation marks020/021/023/045/069/073 scoped corrections
accepted, based on inspected code, exact regressions and accepted D6/main gates.
This is not blanket D7 acceptance: current Next dependency and host-mail failures,
unresolved Windows intermittent observation059 and remaining review still stand.

### IAM groups / Premium / Guardian checkpoint

For008/024, read ADR005/006 policy boundaries, current Authorization capability
service and root IAM adapter, membership validity/public-display reads, group
validation and grant/revoke persistence, and actual migration history/Premium
triggers. Effective grants require enabled groups, unrevoked membership and
inclusive start/exclusive expiry. The adapter derives Premium from kind, not
role name; namespaced groups cannot impersonate legacy staff authority. Guardian
is only the explicit non-Premium Knowledge Forge capability; it grants neither
generic staff permissions nor a workflow/audience override.

Current ContentGatesService checks every GROUP requirement before author or
Premium numeric bypass. Existing ALL/ANY applies to numeric thresholds only.
Management requires current eligibility plus permissions.manage, independently
of Premium membership/display. Grant/mutation audit shares the transaction;
database triggers retain grant/revocation identity and forbid Premium capability
assignments, complementing application checks.

Fresh selected policy units pass74/74 in three suites, zero pending/todo:
`node_modules/.cache/d7-groups-gates-review.json`. Exact main artifact has
access-groups HTTP5/5 and IAM subject transactions5/5. Read assertions include
same-token Guardian changes, overlap/revocation, exact expiry, group disable,
account state, protected metadata and audit-failure rollback. The opt-in database
suite separately tests actual migration constraints; not rerun without its full
disposable profile here. This moves008/024 from initial review to mapped
implementation, not full Phase5 acceptance or new production inventory.

No future resource ACL builders, platform-owner protection, Command Deck step-up
or Phase14 sanction policy is claimed implemented. Those fences are intentional
owner-approved scope, not missing behavior silently bypassed by Premium.

The owner also approved the separate057 sequence after review: tombstone
nullability/client compatibility design, then correction and HTTP regressions.
No057 implementation, generated client or public SDL change is part of D7.

### Gamification / representation / checker checkpoint

For003, inspected Reputation's minimal account/block/profile ports and Points/
Levels/Achievements owned recipient/balance contracts, root adapters/module
bindings and public roots. Existence forwards only ID/Boolean and is not silently
changed to ACTIVE eligibility; Levels reads the authoritative scalar Points
balance without duplicating a ledger/cache. Nest exports keep application
services private. This maps the original broad-service transfer in these paths,
not every semantic transaction or public surface across all features.

For004, bounded direct-import scan of feature TypeScript outside infrastructure,
module assembly and tests finds no Prisma/database imports. Inspected root
content presentation owns wire-enums, explicit mapping and four guarded existing
operations; Editor/ContentAccess business capabilities retain independent values.
No permission policy or ORM enters those transport DTOs/mappings. A textual scan
alone does not resolve aliases, transitive exports or prove all representations.

Fresh composition tests16/16 pass across three suites, no pending/todo; JSON
`node_modules/.cache/d7-composition-boundary-review.json`. Reviewed assertions
include private provider metadata, minimal adapter forwarding/failure, actual
SDL schema-factory/guard/mapping contracts and capability isolation. This is not
a new HTTP/DB verification or a claim that Editor malformed-input066 is fixed.

For005/028, actual report CLI now walks all API src and composes the local
compiler-resolved file graph with feature/Core/root boundary findings. Mandatory
architecture command compares the frozen baseline. The old tooling document
still described D2 report-only/not-yet-CI rollout and excluded root composition;
it now has an explicit current clarification while retaining historical counts.
No scanner rule, baseline identity or application source was changed. Domain/
HTTP079 and secret-flow/physical-containment limitations remain explicit.

Fresh mandatory architecture gate exits0:140/140 tests, zero skipped/todo and
zero bounded findings, frozen baseline unchanged. Retained log:
`dss-d7-current-architecture-review.log` in local temp. This verifies the current
checker contract, not universal semantic compliance.

### Bootstrap / Compose / endpoint checkpoint

For030/031/032, read the remaining bootstrap source and complete dev/test Compose
definitions. Bootstrap preserves existing env files, uses exclusive creation for
missing ones and generated random secrets, validates pinned runtimes and compares
effective API/Worker DB/Redis coordinates to root Compose before deploy/seed.
It calls frozen install, healthy Compose startup and committed deploy/seed; no
automatic migration authoring/reset. Inspection is not a fresh bootstrap run or
proof that all external process overrides/configurations are safe.

Dev Compose binds declared database/Redis/admin/mail/scanner endpoints to
loopback and defines service healthchecks; pgAdmin uses an explicit digest.
Disposable test PostgreSQL is loopback/tmpfs with its own credentials and Redis
port. Optional observability remains a profile. Current Mailpit host mismatch013
does not disappear because the source Compose binding is correct.

For012/030, read primary-checkout local envs only into a metadata comparison:
API/Worker declared PostgreSQL and Redis coordinates match root Compose; both
files and Web env exist, and API has no .env.local override. No values, URLs,
passwords or connection strings were emitted. The comparison excludes arbitrary
current/future process-env overrides and does not authenticate against dev DB.
API JWT access/refresh and2FA key fields are present; explicit MEDIA_SIGNING_SECRET
is absent. The inspected schema permits a dev fallback and requires a32-character
secret in production; production is not selected in that file. No secret entropy
or production readiness is certified and no missing secret is silently written.

Web config/proxy and examples use API3001 `/api` and `/api/graphql`, independently
of Web3000. Local public endpoint alignment is checked as booleans, not printed
env content. No API/Web/Worker start, service recreate, env edit, migration or
seed was performed. These four entries move to mapped evidence, not universal
operational acceptance; host-mail and current dependency gate remain blocking.

### Completion-claim reconciliation checkpoint

Read the complete Phase8/9/10 completion audits against the current Worker
composition. `apps/worker/src/main.ts` supplies only
`activityProjector.project(event)` to the integration-event processor. Points,
Levels and Achievements expose `consume` methods, but their foundation E2E
files invoke these services directly. Those successful component tests do not
prove producer-to-queue-to-gamification delivery. DEBT-007 remains unresolved;
the Phase8 audit already records this limitation. D6 acceptance does not remove it.

Phase9's broad safe-document claim remains bounded by the reproduced malformed
document defect066; its shared tombstone foundation is not a certificate for
News GraphQL delivery057. Phase10's publication routing signals are not automatic
gamification or notification delivery. The accepted main E2E evidence mapped
above strengthens individual workflows, not blanket product completion.
DEBT-026 still requires individual reconciliation of the other completion rows.

Fresh `node --test scripts/braces-patch.test.mjs`:14 passed, zero failed/skipped.
A bounded source scan of apps/packages/scripts found no direct authored braces
expansion use outside the security tooling/tests. This does not resolve transitive
glob consumers, user-controlled pattern reachability or the upstream
parenthesized-pattern error036. No upstream semantics or exception was changed.

### Search / durable identity / presence evidence checkpoint

Read the complete News search performance suite. Its migrated250/1000-article
corpora contain60% gated articles; five samples per lane assert zero guest
projections, exact member projection/facts/audience reads, batches64 and maximum
projection concurrency4. Pagination assertions cover total980, page6/page10,
cursor tails and qualifying pins beyond500. Separate cases compare concurrent
viewer scopes and reject a later batch evidence failure before next-request
recovery. Latency/memory and EXPLAIN are recorded, not production capacity SLOs.
The retained accepted-main E2E artifact has all5 exact cases passed, no other
statuses. This completes the pending053 performance-source mapping, not a fresh
D7 performance run or universal load guarantee.

For061, read the consumer identity boundary suite: a child bridge invokes the
actual Worker implementations against an owned migrated schema/unique Redis
prefix. New marker/DLQ identities are asserted v1. Two retry cases preserve old
v2 DLQ history while asserting canonical-marker deduplication and exact handler
counts for already-processed versus unprocessed events. Accepted-main artifact:
3/3 passed. This is actual DB/Redis boundary evidence, not proof of exactly-once
or automatic gamification integration.

For074, the social privacy suite controls only asynchronous presence touch, not
authorization/privacy grants. Exact seeded timestamps and owner profile equality
remain asserted. A promise gate deliberately persists a later timestamp after
the response, proves the response snapshot remains unchanged and releases/awaits
the gate in finally. No sleep or widened timestamp tolerance is used. Main's
same suite passes6/6; no fresh D7 HTTP run is inferred. The earlier combined
read output was truncated; the identity suite's omitted opening was subsequently
read separately before these conclusions.

### Media retry SQL checkpoint

Read the complete Worker processor, PostgreSQL store and migrated diagnostic
`scripts/audit-media-retry.mjs`. Retry UPDATE requires FAILED and null deletedAt;
one affected row identifies the winner. Claim-loser failure stays outside the
failure-writing catch. READY/variant writes share a transaction with rollback
when the parent is no longer PROCESSING. This is not a global attempt lease.

The diagnostic source asserts transient failure then automatic READY, two actual
lock-blocked CAS contenders yielding one winner, preserved terminal states,
deletedAt refusal, scanner quarantine/clean rescan and variant rollback. It owns
a generated migrated schema guarded to localhost5434/dss_test; it was not run in
this checkpoint. Fresh processor unit run:16/16 passed. No current DB, live
scanner/filesystem or BullMQ guarantee is inferred. Matrix053/061/063/074 now
reflect completed source mapping rather than requesting duplicate inspection.

### Phase8–10 requirement-level reconciliation

The accepted-main artifact is evidence for the named suites below, not a new
D7 execution. Foundation suites contain long multi-assertion scenarios; one
test is not one implemented capability.

| Completion requirement                  | Inspected assertions / evidence                                                                                                                                     | Remaining boundary                                                                                                 |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Phase8 explainable/reversible ledgers   | Reputation and Points foundation scenarios each pass1/1; assertions include reasons/history, reversal and immutable records.                                        | Direct service consumption is not automatic event delivery007.                                                     |
| Phase8 period rankings                  | Leaderboards foundation1/1 asserts MONTH/YEAR/ALL_TIME, ties, inactive exclusion, viewer rank and ledger correction.                                                | No production load or arbitrary concurrent-ranking guarantee.                                                      |
| Phase8 anti-abuse                       | Points cap8/8 and title selection7/7 mapped above; foundation duplicate/cooldown and achievement reversal assertions inspected.                                     | No universal anti-spam claim; current formulas remain unchanged.                                                   |
| Phase8 permission-neutral titles/groups | Titles foundation1/1 and groups5/5; distinct group/policy evidence recorded above.                                                                                  | Old generic-groups-absent wording is historical, not current implementation state.                                 |
| Phase9 canonical/redacted document      | Editor/News unit and HTTP evidence above; current malformed/deep document066 and News null tombstone057 contradict unconditional safety.                            | Separate approved/design corrections remain necessary.                                                             |
| Phase9 deterministic feed               | Activity Feed3/3 asserts guest visibility, block filtering, FOLLOWING/INTEREST reasons and independent visit cursor. Actual Web page loads feed without an AI call. | UI fallback activity/metrics are static examples; no live AI failure-injection or completed Mission Control claim. |
| Phase9 shared ownership                 | Root ports/transactions and interaction owner policy suites mapped above.                                                                                           | Domain HTTP079 and Activity ordering067 remain separate; no blanket semantic independence.                         |
| Phase10 publication lifecycle           | News foundation1/1 includes draft/revisions, review, schedule, explicit publishDue invocation, delivery/navigation and real view increment.                         | Manual due invocation does not prove scheduler recovery under process failure.                                     |
| Phase10 pin windows/workflow            | Fresh workflow/pinning units12/12, plus hybrid corpus assertions for expired/category pins and exact pages.                                                         | No live wall-clock scheduler/retry certification from units.                                                       |
| Phase10 delivery/search                 | Viewer redaction20/20, attachment29/29, related12/12, secondary21/21, engagement31/31 and search performance5/5 mapped above.                                       | 057 remains; accepted Search/Notifications deferrals do not erase007 runtime wiring.                               |
| Phase10 SEO/browser                     | Accepted generated-operation and14-smoke evidence exists.                                                                                                           | Generic smoke is not every SEO metadata/sitemap/publication scenario.                                              |

The fresh two-suite Jest command passed12/12; its combined shell call later
returned1 because a separate documentation grep found no matches, not because
Jest failed. No runtime/UI changes, gate waivers or phase acceptance were made.
007/026 move from unreviewed routing to mapped-with-explicit-gaps;036 is also
mapped with its bounded direct-use scan and unchanged upstream-error limitation.
Zero R entries means initial routing is complete, not that M/Q/O work is closed.

### Identity / mail / logging secret-boundary checkpoint

Read actual authentication presentation and legacy JWT issuer: both construct
explicit fields, not whole persistence-record spreads. Response tokens are the
intentional login/refresh contract; credential hashes are not profile output.
Authoritative request access returns copied roles/permissions only. Fresh four
API suites covering presentation, issuance, request access and audit redaction:
18/18 passed. This is not every DTO/HTTP response;040 remains separate.

Read the credential repository and mail processors. Account audit entries carry
action/actor/target coordinates rather than credential values. Mail tokens are
generated in Worker, stored as hashes, placed in URL fragments for intended email
delivery and not returned as job results. SMTP send failures become generic errors;
Worker mail failure logs contain job IDs, not recipient/message/provider errors.
Nodemailer logger/debug are disabled. Fresh three mail processor suites:8/8 pass;
no real email or SMTP readiness is demonstrated (013 remains open).

Audit redaction recursively censors sensitive key names, not arbitrary secrets
under innocuous keys; its current unit covers one nested-credentials example.
API pino config has explicit authorization/cookie/password/token/GraphQL paths,
not a universal arbitrary-object sanitizer. OutboxWriter persists the producer's
payload/metadata without general redaction; producer-by-producer semantics still
matter. Non-mail Worker integration/media failures log Error objects and may
retain failure reasons/DLQ payloads. No secret leak is established by this
inspection, but those paths are not certified secret-free. No broad clean-secret
claim, new waiver, env disclosure or logging/runtime change is made.

### Credential-mail producer checkpoint

Read verification/recovery/security-alert application orchestration and all three
BullMQ delivery adapters. Queue payloads explicitly select destination/time,
verification subject ID or security event identity/kind as appropriate; arbitrary
extra credential fields are not spread into jobs. These jobs contain personal
email destinations by design, not anonymous payloads. Recovery queues unknown
addresses too, avoiding a producer-side account lookup in the public request.
Security alerts remain best effort after committed operations, not transactional
Outbox delivery; registration verification enqueue failure does not undo signup.

Read actual Redis recovery/verification adapters after correcting the initially
guessed directory. Token/email/IP inputs become namespace-specific HMAC digests
before Redis keys; atomic INCR/first-use EXPIRE uses the existing900-second fixed
window. Raw reset tokens do not appear in these key strings. No Redis failure
allow-fallback is present. Fresh six selected producer/rate-limit/alert unit
suites:23/23 passed. This is source/unit evidence, not fresh SMTP, Redis runtime,
timing-enumeration or crash-durable security-alert delivery acceptance. No real
mail, queue enqueue or production data write was performed.

### Orientation / timeout scope checkpoint

Root README still selected Platform Foundation Phase2 despite accepted D5/D6
and active D7. Corrected only its current-status block to select the maintained
context, plan and register, retaining open security/debt gates. The documentation
index already selects current context/canonical roadmap; older phases and the
compatibility workflow explicitly redirect. Naming conflict039 and remaining
historical guides are not resolved by changing this entry point.

For048, inspected the actual test wrapper: registeredViewerWorkflow is the
87-sequential-HTTP feature workflow with an explicit30000ms budget. Main's exact
case passes in2582ms. This is distinct from CI quality job's30-minute budget;
the matrix description is corrected accordingly. Its accepted scope is a
bounded scenario budget, not proven root cause of every historical stall.
The current workflow concurrency cancels obsolete same-ref runs; Storage keeps
both OS lanes with fail-fast false. No workflow/test budget or runtime changed.

### Fresh consolidated gate attempt — source57db97e

Ran `pnpm quality:full` with explicit committed non-production test coordinates:
PostgreSQL localhost5434/dss_test and Redis6380, test-only JWT secrets and
disabled periodic Outbox dispatch. Existing disposable services were healthy.
No provisioning, migrate/deploy, seed, reset, dev5433 access or service restart
was performed. Prisma generation changes ignored generated client artifacts,
not tracked schema/source. The terminal process exited1, not an observation
timeout; no second attempt or skip-to-green was started.

Passed before failure: repository format, architecture140/140 with zero bounded
findings, Prisma validate/generate, read-only drift (`No difference detected`),
lint9/9 Turbo tasks, typecheck9/9, full-policy40/40, quality-policy5/5 and
security-policy9/9. Task success does not imply every Turbo task was uncached.

Security audit still reports2 critical,2 high,12 moderate. Exact braces patch,
installed-copy verification and14/14 regressions pass under the previously
approved single advisory exception. Blocking findings remain
GHSA-2464-fhr4-w9xw (critical), GHSA-p3m5-59mp-jv5r (high) and
GHSA-673q-mjm6-r5xr (critical). No exception was added.

Coverage/full tests, API E2E, GraphQL check, production build/entry and fresh Web
smoke follow security in the runner and therefore did not execute in this
attempt. Earlier accepted D6 evidence is not relabelled fresh D7 evidence.
The raw log is retained outside Git at
`C:/Users/admin/AppData/Local/Temp/dss-d7-quality-full-current.log`, SHA256
`18DE04C2056D5E27DB9D9C6EC20D5E2C76D724A810402EF2100FE48E2DC5886F`.
Tracked worktree remained clean after the attempt. D7 release acceptance is
blocked; the separately requested dependency correction still needs approval.

### Fresh identity atomicity DB checkpoint

After command access recovered, selected three actual opt-in PostgreSQL suites
with RUN_AUTH_DB_TESTS/RUN_IAM_DB_TESTS enabled and explicit disposable5434.
All36 pass: email verification14, second factor15, protected-role revocation7;
JSON success=true and zero failed/pending/todo/other assertion statuses. Evidence:
`node_modules/.cache/d7-identity-atomicity-current.json`. Source is unchanged.

These suites exercise production repositories in generated schemas, copied
from the already migrated disposable public tables. They are not a fresh
migration replay. Audit is doubled in Auth cases. IAM's synthetic storage-failure
trigger intentionally emits a Prisma error, and its rollback assertion passes;
that expected diagnostic is not a failing test. Fresh read-only namespace query
after completion finds no factor*test*, verification*test* or iam*revoke* schemas.
No public fixture rows, dev5433, service restart or migration/reset was involved.

This strengthens042/046/068 beyond source inspection: actual lock-order,
single-use/rollback and destination-proof schedules pass now. It does not solve
047 administrator availability, certify HTTP metadata040 or turn the security-red
consolidated gate green. The earlier command-limit rejection executed no work;
it was not bypassed.

### Fresh registration / groups / assignment DB checkpoint

Ran three opt-in suites on explicit disposable5434: registration atomicity8/8,
access-group persistence15/15 and IAM assignment reads3/3. JSON success=true,
26 passed, zero failed/pending/todo and zero non-passed assertions. Retained:
`node_modules/.cache/d7-registration-groups-current.json`. Read-only namespace
check afterwards finds no registration*, access_groups* or iam*access* schemas.

Registration exercises actual shared-row transaction and application composition
with downstream token/session/mail instrumentation, including injected failure
boundaries; not HTTP E2E. Groups apply the actual additive migration inside a
guarded owned schema, using actual audit writer/redactor, preserving capability-
free Premium and immutable membership/revocation constraints. Assignment reads
exercise ordered minimal fields and ordinary unique/FK-backed writes. This is
not replay of all migrations or full Phase5/Auth/IAM acceptance. Expected Prisma
errors from intentional rejection/constraint cases accompany passing assertions.
No source, public fixture rows, dev5433 or service state was changed.

### Fresh migrated Media retry checkpoint

Verified the diagnostic and two Worker runtime sources have no diff from accepted
f118d82; rebuilt Jobs and Worker successfully, then ran
`node scripts/audit-media-retry.mjs` on explicit disposable5434. Terminal exit0.
The script replayed committed migration SQL in its own generated schema and
verified transient failure to FAILED then automatic READY, duplicate no-op,
two observed lock-blocked CAS contenders/one winner, terminal/deleted predicates,
scanner-unavailable/infected quarantine, clean rescan and transactional variant
rollback when READY completion loses its eligible parent state.

Post-run read-only catalog/activity checks show zero audit*media_retry* schemas
and zero associated connections. No tracked build changes, dev5433 use, real
filesystem transform/scanning, queue worker startup or service restart occurred.
This supersedes the earlier source-only063 evidence for the diagnostic run,
not its stated no-global-lease boundary or the consolidated security failure.

### REST DTO compatibility probe —040

Read current REST DTOs, GraphQL inputs, controller, bootstrap and app E2E setup.
Register displayName is required in both decorated contracts, while the root
application composition accepts an optional displayName. Login factor is optional
with the same format decorators; GraphQL refresh additionally requires length1,
whereas the REST DTO declares only IsString. These are compatibility decisions,
not permission to silently make transports identical.

Current compiled controller metadata remains Function for body parameters.
Synthetic in-process Nest ValidationPipe with Function metatype and actual
production options (transform/whitelist/forbidUnknownValues=true) returns400
unknown-value; with explicit built RegisterDto, the otherwise-valid body without
displayName returns400 with displayName validation messages. Without explicit
forbidUnknownValues the Function probe accepts it. No HTTP endpoint or DB was
touched by the probe, and it does not prove production endpoint outcome.

The inspected app E2E setup also explicitly enables forbidUnknownValues, and
accepted-main REST assertions passed. Therefore do not explain the discrepancy
as weaker E2E pipe options: actual Jest-versus-build emitted metadata and built
HTTP behavior need characterization. A separate compatibility-first040 packet
was requested; no import, decorator or API change is made in D7.

### Owner approval — separate040 compatibility packet

The owner explicitly approved comparing Jest/production metadata and HTTP
behavior first, then agreeing displayName compatibility before DTO validation
correction. Continue in a separate branch from accepted main, not as D7 runtime
changes. Existing Auth/Users ownership and successful response shapes remain
fixed boundaries. Next/Mailpit approvals remain separate and are not inferred.

### Owner naming reconciliation checkpoint

While PR80's separate exact-head CI continued, corrected only canonical roadmap
and module-map product labels to the already approved owner decision: personal
Mission Control, administrative Command Deck. Phase19/22 numbers and scope are
unchanged. Legacy /command-deck and /mission-control route strings are explicitly
retained for compatibility review, not treated as permission or rename authority.
Historical Media delivery wording is labelled historical, not a new UI change.

Module-map access/scope wording remains subordinate to recorded owner decisions;
this edit implements no owner powers, administrative endpoints or UI.039 remains
open for Research Lab/Knowledge Forge product-boundary reconciliation and actual
route/UI integration. Old checkpoint statements about reversed roadmap labels
describe the pre-correction source, not the current canonical naming table.

### Separate040 candidate — terminal CI evidence

Owner-approved040 implementation remains separate in draft PR80 at
2ae30c6844aff8071308f2fe3c5590fcf68e779d, not merged into main or D7. Owner confirmed
REST optional/nonblank displayName and unchanged GraphQL. Concrete DTO imports,
17 unit regressions and real HTTP validation/flows are implemented there.

Its forced local full coverage exits0: API1315/1315 in172 suites, Web60, Worker50,
Storage43;7 tasks,zero cache. Raw log SHA256:
`D2A5FF06BF944363A4BB15AB5F51E773390B0A7EF298EC66C8EDA8837FEDEC10`.
CI Quality39964996282 is terminal: quality and Web smoke succeed, dependency audit
fails on the same three Next advisories. Storage39964996186 succeeds on both OS.
Quality job120452430847 logs actual1315 unit/607 E2E passes, empty schema drift
and both post-build tests, including concrete DTO loopback HTTP regression.

Downloaded actual CI E2E artifact passes strict no-skip policy:607/607 in56 suites,
zero failed/pending/todo/runtime errors. Retained under
`node_modules/.cache/debt040-ci-2ae30c6/api-e2e.json`, SHA256
`E6607DE01902C9BB106835EEB2B1DF08B57C49D4186BC4821FEF2D9980B08E9D`.
PR body updated with these exact-head results without another source push/CI run.
Four green checks do not waive the failed fifth.040 is a verified candidate,
not accepted-main correction;016 approval/remediation and final gate remain.

### Entry-check checkpoint (2026-10-23)

- Both retained entry commands terminated with exit0: `pnpm format:check`
  and `pnpm architecture:check`. Architecture tests: 140 passed, zero failed,
  skipped or todo; bounded inventory: zero findings. This is not a Domain
  independence certificate, as DEBT-079 demonstrates.
- A local-link existence probe over the three D7 documents checked 87 links
  with no missing targets. External URLs and anchors were excluded.
- A current tracked-tree heuristic found no matches for the selected private-key,
  GitHub-token and OpenAI project-key patterns. This is not an entropy scan,
  history scan or proof that no secrets exist. No dotenv values were printed.
- Corrected IAM inspection includes its actual access-groups, permissions,
  roles, safety and user-access subfeatures. The bounded import scan found
  Prisma imports only under IAM infrastructure and no wildcard exports or
  matching direct Auth/Users imports. It does not resolve indirect dependencies,
  provider wiring or runtime authorization; DEBT-001/002/027 remain under review.

1. Complete individual evidence/disposition mapping for every remaining entry,
   distinguishing stale labels from live Critical/High defects.
2. Reconcile Auth/Users/IAM/Authorization ownership and revocation, transaction
   rollback, DTO semantics and public named surfaces.
3. Review News/Editor privacy across projections/search/interactions; Media
   containment/lifecycle and Worker/Outbox idempotency/ordering.
4. Verify migration history/schema, dependency exception scope, tracked secrets
   and relevant transport/log/event allowlists. State scan/history limitations.
5. Obtain explicit risk dispositions or bounded fix approvals. Future owner
   functionality is not proof that existing availability risk is resolved.
6. Run final D7 quality/CI and owner review. The later technology-boundary stack
   audit follows its owner-authored plan separately.

No D7 acceptance, stack-audit completion or Phase11 readiness is claimed.

### Identity public surfaces and atomic enrollment — additional D7 evidence

Reviewed the actual Auth/Users/IAM named roots, their Nest export arrays, Auth
credential/account-evidence contracts, Users profile port and IAM assignment
contract. Auth exports four capability tokens, Users six and IAM four; concrete
application services remain local providers in these inspected modules. A named
TypeScript export is not the same thing as a Nest provider export: several
consumer-owned ports are implemented/bound by root composition rather than
exported as feature providers. This inspection does not certify all module roots.

CredentialSubjectStore is a deliberately trusted write-only enrollment input:
email/passwordHash enter the root transaction, which returns only subject ID.
Inspected consumers are Auth enrollment, its owned credential fragment and root
registration contract/adapter. The shared INSERT composes explicit Auth and Users
fragments, with IAM-owned baseline-role lookup/assignment in the same transaction.
No profile object is passed into Auth.enroll. This is the approved transitional
shared-row composition, not a claim of physically separate persistence.

Inspected AuthenticationPresentationService explicitly copies profile and token
fields, denies missing/mismatched profiles and does not spread provider results.
PrismaViewerProfileReader delegates to safe profile assembly and UserMapper's
explicit allowlist. ViewerProfile intentionally includes email, account state and
presence for existing internal presentation; it is not an anonymous/public HTTP
privacy contract. Social/public redaction remains a separate responsibility.
Auth account evidence selects only status/createdAt and returns active/createdAt.

Fresh tests on D7 head3f90321: public surfaces/profile-asset boundaries/registration
unit suites17/17; presentation allowlists, Users mapper/reader and actual PostgreSQL
registration atomicity24/24, zero skipped. The DB suite uses its own registration
schema on disposable5434 and instruments downstream issuance/delivery; it is not
a fully migrated-schema or HTTP proof. Expected injected database rejection logs
are asserted rollback scenarios, not unnoticed test failures. Raw latter report:
`node_modules/.cache/d7-identity-public-review.json` (ignored). Remaining lifecycle,
all-public-root and transport/log/event review is not closed by these seven suites.

### Separate057 candidate — implementation checkpoint

Owner approved the exact nullable contract; separate draft PR81 at
ccc8f9ca74bea7aa2db539b627f644c8f6658498 implements only NewsComment body/documentJson
nullability, generated Web compatibility and database-null preservation in the
Interactions delivery mapper. No migration, writer/history rewrite or UI redesign.
Local related HTTP71/71, Web61/61, architecture140/140, API/Web types, changed-source
lint and production build pass. Full quality stops at the same three blocking
Next advisories after earlier checks; later consolidated stages did not run.
At this checkpoint both containment OS checks and Web smoke pass, dependency audit
fails and the quality job remains live. Candidate is not merged or accepted main;
terminal CI must be reconciled before any stronger claim.

Correction after inspecting actual Web job logs: job120465792097 is green but
reports one flaky and13 passed. Core module demo test arrival.spec.ts106 failed
its line112 visibility assertion on the first attempt and passed on retry.
CI Playwright config permits retries2 and ci.yml invokes plain test:e2e; strict
local quality:full's retries0/report policy does not apply to this CI command.
Record DEBT-080 separately; no clean-first-attempt Web acceptance or specific
runtime root cause is claimed. The earlier green-check observation above refers
only to GitHub status, not the stricter result policy.

### Separate057 revised head — terminal CI and local full E2E

PR81 revised head03a5937e21982de47348e2046046bb35c25872b0 replaces the obsolete
characterization expectation of a GraphQL error with an intact exact nullable
tombstone page; its old-body non-disclosure assertion remains. Both relevant
HTTP suites pass9/9. No additional runtime change was required.

Quality run39975686961 is terminal: quality job120489533013 succeeds, actual
API units1298/1298 and E2E596/596 in56 suites; generated operations and production
build pass. Web job120489532677 logs14 passed without a flaky result this run.
Containment run39975687108 passes both OS. Dependency audit120489532481 fails;
the candidate remains draft/unmerged. No red merge or full D7 acceptance.

Downloaded CI E2E artifact independently passes strict no-skip/no-todo policy:
`node_modules/.cache/debt057-ci-03a5937/api-e2e.json`, SHA256
`80F38053D34BD0F9320BAD2D06AA6F8FE7C368AB8C3D42276A5DAA4FF28BA5C7`.
Separate local full API E2E at the same head also passes596/596 in56 suites,
exit0, with all four mandatory opt-ins and strict report validation. Retained
report `node_modules/.cache/debt057-full-e2e.json`; raw log
`%TEMP%/dss-debt057-full-e2e.log`. This does not turn the stopped full quality
attempt into a complete gate or waive the dependency failure.

Owner approved DEBT-080 as its own package: reproduce readiness/action ordering,
test-only correction if proved, mandatory CI smoke without retries, unchanged
runtime/UI/timeouts/assertion strength. One later clean run does not erase the
earlier flaky evidence. No DEBT-080 implementation is included in PR81 or D7.
