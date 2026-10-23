# D7 — Baseline release review

Date: 2026-10-22. Updated: 2026-10-23. Branch: `debt/d7-release-gate`.
Baseline: `f118d82d62eca0f7783a79c0f624c7ee7e688c27` (accepted D6 merge PR79).
Status: **IN PROGRESS — not release acceptance or Phase11 readiness**.

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
- No new full D7 gate has run. Passing tests prove their covered behavior,
  not all ownership rules, all untrusted inputs or all78 debt dispositions.

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
