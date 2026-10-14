# DSS Universe — Engineering Debt Register

> Status: Active
>
> Updated: 2026-10-14

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
| DEBT-016 | Critical | OPEN     | Dependencies          | Audit now 0 critical / 1 high / 10 moderate; braces local mitigation is not an accepted audit exception.       | D0.5/D6                |
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

Every new entry should include evidence, impact, proposed ownership and a clear
decision before implementation. Discovery is not permission to expand the
current package silently.
