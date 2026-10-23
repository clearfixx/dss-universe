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
This is an identifier inventory, **not 79 completed reviews**. For each entry map
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
