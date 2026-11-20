# Final D7 reconciliation — Phase A

> Historical checkpoint. Current authoritative statuses and completion: [Final D7 closure](FINAL_D7_CLOSURE.md), 2026-11-17.

Date: 2026-11-15. Baseline: `790f098f5c17a92e32ecf58465a90e924a1869f2`.
Status: owner approved the finite work list after discussing047. This is not D7
acceptance. The owner chose implementation of047 with the future owner model,
not an interim last-administrator policy. Phase B proceeds with067 and007/090.

Authority: owner's Final Audit Closure Directive. No production, schema, test,
dependency, workflow, frontend or application-data changes belong to Phase A.
Branch: `codex/audit-final-d7-reconciliation`.

## Evidence and interpretation

GitHub's current `main` resolves to the baseline above (connector lookup during
this reconciliation). PR88 and PR162 are confirmed merged through the connector;
local first-parent history also includes the accepted packages referenced below.
The ordinary local Git remote lookup failed with `getaddrinfo() thread failed
to start`; the connector supplied the independent remote observation instead.

The register contains 95 unique debt IDs, not 95 currently defective features.
Its original table and repeated checkpoint headings are historical. The retained
[91-row matrix](D7_DEBT_DISPOSITION_MATRIX.md) supplies individual evidence scopes,
not current statuses. The [integration checkpoint](D7_INTEGRATION_CHECKPOINT_2026-11-15.md)
and later accepted merges override its older candidate/unimplemented statements.

Verification evidence has three distinct levels:

- Existing accepted reports and individual source/test reviews remain evidence
  of their stated revisions and scopes. Their test counts are not fresh runs.
- PR162's exact implementation passed local `quality:full`: API1547/1547,
  E2E883/883 without skips/todo, build6/6, Web15/15 without retries and coverage
  in five executable workspaces. PR88 changes seven Markdown files only and has
  final-head CI8/8 with the same runtime/test/configuration and those test totals.
- Fresh Phase A checks: current Git/main and merge history; current register
  inventory; legacy architecture subset and frozen AST inventory, both passing,
  with zero frozen findings. Source inspection reconfirms UPDATE-only Activity
  retraction, unguarded Auth account deactivation for administrative availability,
  qualified Achievements compatibility guards, and missing automatic-delivery
  integration. These checks are not a new full quality run or production audit.

`FIXED_VERIFIED` below applies only to the original concrete finding and its
accepted correction. It does not certify every hypothetical future race,
unreviewed historic document, production deployment or complete product phase.
Separate known residuals retain their own rows; generic remaining review work
is not another runtime defect. Dependency corrections concern their recorded
advisories; fresh advisories are checked in Phase E, not assumed absent today.

## Complete disposition matrix

Each ID occurs once. Evidence names refer to accepted repository artifacts,
source/test contracts or merged PRs; the historical matrix retains the earlier
individual observations. Acceptance in the final column is the bounded criterion,
not a demand for new tests when existing accepted tests already establish it.

| Debt | Result                | Evidence and present scope                                                                                                                | Acceptance criterion / remaining action                                                                                                       |
| ---- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 001  | FIXED_VERIFIED        | D3 Auth ports, registration composition and accepted Auth/Users HTTP/DB cohort; D4 persistence transfer                                   | No Users internals or profile lifecycle inside Auth; 047 remains separate                                                                     |
| 002  | FIXED_VERIFIED        | Auth/IAM owned repositories; D3 acceptance source review and current zero-finding inventory                                               | No direct database service in the reviewed business services                                                                                  |
| 003  | FIXED_VERIFIED        | Narrow gamification owner ports, private assemblies; accepted composition and transaction tests                                           | Foreign broad services removed; missing automatic delivery is 007                                                                             |
| 004  | FIXED_VERIFIED        | D4 root presentation composition and owned wire/domain types; frozen inventory passes                                                     | Original business/presentation Prisma leakage removed within checked scope                                                                    |
| 005  | FIXED_VERIFIED        | Blocking AST/file-graph baseline, architecture tests, current zero-finding check                                                          | Known frozen violations cannot silently pass; not universal architectural proof                                                               |
| 006  | FIXED_VERIFIED        | Current project context/roadmap precedence; accepted D1 and integration preserving main docs                                              | Current guidance replaces obsolete Phase2 status; naming scope in 039                                                                         |
| 007  | CONFIRMED_BLOCKER     | A/A.1 PR101, routing B PR104, O1 PR147, P1 PR149, C2.1 PR153, L1 PR159, source guard PR162 accepted; automatic consumer still absent      | Complete only missing qualified Points/cycle, producer/configuration, delivery and recovery links before activation; see finite work below    |
| 008  | FIXED_VERIFIED        | D3.5 access groups, expiry/revocation, explicit Guardian and Premium non-staff contracts; accepted DB/HTTP evidence                       | Preserve memberships and audience-first Premium numeric bypass; not new module ACL implementation                                             |
| 009  | DEFERRED              | Owner explicitly removed bulk File Passport work from D5                                                                                  | Future owner-selected Passport package; no D7 blocker                                                                                         |
| 010  | FIXED_VERIFIED        | D1/D2 legacy role guidance redirects to canonical permission/ownership rules                                                              | Original conflicting guidance superseded; no exhaustive rewrite of every historical example                                                   |
| 011  | FIXED_VERIFIED        | Canonical phase/workflow authority, now bounded by Final Audit Closure Directive                                                          | Follow explicit phase approvals; old unlimited audit objective superseded                                                                     |
| 012  | FIXED_VERIFIED        | Accepted local API/Worker DB/Redis and required-secret alignment; environment checks                                                      | Accepted local development configuration only; not arbitrary production overrides                                                             |
| 013  | FIXED_VERIFIED        | PR91/106 accepted; final Mailpit SMTP12525/UI18025 and preserved volume/messages verified                                                 | Local mail delivery and persistence established; no claim service is running forever                                                          |
| 014  | FIXED_VERIFIED        | Accepted CLI installation/authentication; current connector can read main and merged PRs                                                  | Repository access available; a local DNS-tool failure is not revoked authentication                                                           |
| 015  | FIXED_VERIFIED        | D6 quality:full runner; coverage completeness PR85 and accepted terminal gates                                                            | All required checks actually run; historical diagnostic findings separate                                                                     |
| 016  | FIXED_VERIFIED        | Accepted PR84 dependency corrections and subsequent PR107/120 patches                                                                     | Recorded advisories corrected; fresh advisory assessment belongs to Phase E                                                                   |
| 017  | DEFERRED              | Owner accepted LOCAL-only storage before Phase11                                                                                          | S3/MinIO adapters remain future work, not a release-gate prerequisite here                                                                    |
| 018  | DEFERRED              | Owner accepted News-local search                                                                                                          | Shared Search Platform remains future work                                                                                                    |
| 019  | DEFERRED              | Passport rendering repair accepted; remaining classification explicitly excluded                                                          | Preserve repair; do not restart bulk Passport cleanup                                                                                         |
| 020  | FIXED_VERIFIED        | API/two Worker portable key guards, pre-IO variant validation and cross-OS tests                                                          | Reject traversal and separators; hostile local writer research is 037                                                                         |
| 021  | FIXED_VERIFIED        | Shared dependency build ordering and strict Turbo wrapper accepted in D6                                                                  | Cold required builds precede dependent execution                                                                                              |
| 022  | FIXED_VERIFIED        | Accepted D6 formatting/generated-path policy; PR88 repository-wide format passes                                                          | Required formatting passes without bulk Passport scope                                                                                        |
| 023  | FIXED_VERIFIED        | Buffer-backed Sharp metadata and source cleanup; accepted Worker/cross-OS tests                                                           | Original Windows cleanup failure addressed; not blanket Windows reliability                                                                   |
| 024  | FIXED_VERIFIED        | IAM facts/root translation/Authorization policy and audience-first tests                                                                  | Premium grants no staff powers and cannot bypass audience; future owner features separate                                                     |
| 025  | FIXED_VERIFIED        | Canonical roadmap precedence, historical warnings, D1 reconciliation preserved in PR88                                                    | Old milestone documents cannot override current plan; no automatic reopening for incomplete historic indexing                                 |
| 026  | CONFIRMED_NON_BLOCKER | Phase9/10 completion wording spans features and defects tracked separately, including 067                                                 | Final report must qualify completion claims; no separate runtime fix or blanket Phase9/10 certificate                                         |
| 027  | FIXED_VERIFIED        | D4 named public contracts/private Nest providers and root SQL composition; current frozen inventory                                       | Original broad/wildcard service exposure corrected within accepted D4 scope                                                                   |
| 028  | FIXED_VERIFIED        | Current architecture rules/ADR003/004 and historical draft warnings                                                                       | Services use owned persistence contracts; obsolete drafts are not active authority                                                            |
| 029  | FIXED_VERIFIED        | Worker env-file startup, validation and fail-before-IO checks accepted                                                                    | Missing required environment fails predictably; not proof of auto-gamification delivery                                                       |
| 030  | FIXED_VERIFIED        | Accepted endpoint defaults and explicit dev overrides; PR105 startup/GraphQL/CORS checks                                                  | Current configured endpoints agree; no global port change required                                                                            |
| 031  | FIXED_VERIFIED        | Bootstrap preservation/coordinate checks plus accepted PR110 strict query guard                                                           | Refuse unapproved DB target overrides before install/deploy/seed; preserve existing env                                                       |
| 032  | FIXED_VERIFIED        | Accepted Compose image/binding/health configuration and operational checks                                                                | Scoped service configuration verified; no perpetual-uptime assertion                                                                          |
| 033  | FIXED_VERIFIED        | Explicit telemetry startup with optional collector under accepted local scope                                                             | Collector is optional; persistent observability is not promised by this entry                                                                 |
| 034  | FIXED_VERIFIED        | Accepted Sign in/login smoke selectors and later strict Web smoke gates                                                                   | Original selector drift corrected; no frontend redesign                                                                                       |
| 035  | FIXED_VERIFIED        | API serial execution and accepted Web maxWorkers2 mitigation, shared with 076                                                             | Bounded concurrency correction accepted; original universal OOM cause is not claimed                                                          |
| 036  | CONFIRMED_NON_BLOCKER | Pristine and patched braces share parenthesized-pattern TypeError; no affected application path established                               | Retain upstream compatibility limitation; no behavior rewrite; security patch exception is distinct                                           |
| 037  | DEFERRED              | Explicit owner/DSS-only filesystem writers; accepted PR142                                                                                | Hostile OS-writer research is not a pre11 blocker; R1–R6 remain inactive research, not production admission                                   |
| 038  | FIXED_VERIFIED        | D6 CI job budget and terminal full suites accepted, including current 883 E2E                                                             | Required gate completes within configured CI budget; no indefinite capacity guarantee                                                         |
| 039  | DEFERRED              | Owner selected one Wiki named Research Lab; Knowledge Forge is legacy alias                                                               | Technical routes/IDs rename considered in relevant product phase, not a second module or audit blocker                                        |
| 040  | FIXED_VERIFIED        | PR80 accepted/merged d452cdd; production DTO/HTTP evidence                                                                                | REST displayName optional but valid when supplied; GraphQL contract unchanged                                                                 |
| 041  | FIXED_VERIFIED        | Decoded IV/tag/ciphertext mutation assertions accepted in D6                                                                              | Tampering tests deterministically change actual decoded bytes                                                                                 |
| 042  | FIXED_VERIFIED        | D3.4 subject serialization and deterministic 2FA DB/HTTP/rollback coverage                                                                | Original setup/disable concurrency protected; not administrative availability 047                                                             |
| 043  | FIXED_VERIFIED        | Same-JWT permission revoke/rename/delete HTTP cases and current-access resolution                                                         | Stale JWT grants do not retain new-request authority                                                                                          |
| 044  | FIXED_VERIFIED        | D6 generator/barrel baseline and later generated-client gates                                                                             | Generated schema/client consistency passes; not every export's universal compliance                                                           |
| 045  | FIXED_VERIFIED        | D5/D6 isolated News/leaderboard migrated fixtures and real view0→1 assertions                                                             | Original shared fixture and null/zero expectation failures corrected                                                                          |
| 046  | FIXED_VERIFIED        | Protected-role shared lock, competing revocation and rollback/HTTP tests accepted                                                         | Preserve assignment-count invariant only; 047 remains distinct                                                                                |
| 047  | DEFERRED              | Owner approved protecting the unique owner in its product phase, without an interim last-administrator policy                             | Owner cannot be deleted/deactivated/banned or stripped of authority through DSS; no recovery backdoor; current availability risk remains open |
| 048  | HISTORICAL_EVIDENCE   | Historical long multi-request registration test; accepted bounded budget and subsequent passing gates                                     | Preserve original stall uncertainty; no current reproducible runtime defect established                                                       |
| 049  | FIXED_VERIFIED        | Accepted schema annotation alignment with existing SQL migrations and zero drift                                                          | Defaults/Uuid/indexes match existing SQL without historical migration rewrites                                                                |
| 050  | FIXED_VERIFIED        | Awaited React cleanup and actual disposal regression accepted in D6                                                                       | Original unhandled scheduler error corrected within tested lifecycle                                                                          |
| 051  | FIXED_VERIFIED        | Canonical EditorDocument attachment traversal and 29-case accepted HTTP evidence                                                          | Preserve gate exclusion plus READY/PUBLIC/reference rules                                                                                     |
| 052  | FIXED_VERIFIED        | Viewer-safe Full News document projection before attachment handling; accepted redaction suite                                            | No denied document fallback on provider failure                                                                                               |
| 053  | FIXED_VERIFIED        | Accepted hybrid search, batches64, count/pin/page and performance regressions                                                             | Search/count cannot reveal gated text; no hidden result cap or new Search Platform                                                            |
| 054  | FIXED_VERIFIED        | Related-article eligibility before metadata projection; ordered HTTP regressions                                                          | Denied related title/slug excluded; order of allowed targets retained                                                                         |
| 055  | FIXED_VERIFIED        | Accepted compiled API entry-path correction and actual production-entry smoke                                                             | Production start resolves the built entry                                                                                                     |
| 056  | FIXED_VERIFIED        | News eligibility precedes secondary comments/rating queries; accepted totals/pages cases                                                  | MEMBERS content not exposed through guest secondary projections                                                                               |
| 057  | FIXED_VERIFIED        | PR81 accepted/merged 746d981; regenerated Web client and HTTP tombstones                                                                  | Nullable body/document preserve tree/totals/history without fabricated text                                                                   |
| 058  | HISTORICAL_EVIDENCE   | Historical document-tool 5s timeout; current accepted Web gates pass                                                                      | Cause not established; do not claim mitigation proves root cause or add new diagnostic infrastructure                                         |
| 059  | HISTORICAL_EVIDENCE   | Historical Windows schema.gql open failure; later passing generated/E2E gates                                                             | No current reproduced schema-write defect; retain failure evidence/limits                                                                     |
| 060  | FIXED_VERIFIED        | Accepted single-SQL totals/null-row correction and explicit empty-page/viewer tests                                                       | Correct total/totalPages beyond page end with absent viewer                                                                                   |
| 061  | FIXED_VERIFIED        | Accepted v1 consumer identity, historical marker dedup and DLQ retry checks                                                               | Preserve v1 identity/history; no exactly-once assertion                                                                                       |
| 062  | FIXED_VERIFIED        | Event→quota serialization and deterministic distinct-event cap DB regressions                                                             | Concurrent events cannot exceed UTC-day cap; immutable economic semantics retained                                                            |
| 063  | FIXED_VERIFIED        | Accepted FAILED→PROCESSING CAS, actual automatic retry/rollback/quarantine tests                                                          | Automatic retry can reach READY; not a global job lease redesign                                                                              |
| 064  | FIXED_VERIFIED        | Shared user/title locks with post-lock eligibility reads; deterministic DB schedules                                                      | Revoked/deactivated grant cannot remain newly selected; cooldown/history retained                                                             |
| 065  | FIXED_VERIFIED        | Accepted UUID claim token/CAS and stale recovery DB tests                                                                                 | Old dispatcher completion cannot overwrite newer claim/publication; at-least-once retained                                                    |
| 066  | FIXED_VERIFIED        | PR89 accepted/merged 4ad31b9; malformed nodes and depth64/65 tests                                                                        | Controlled BAD_USER_INPUT/statusCode400, depth64 valid; no global formatter change                                                            |
| 067  | CONFIRMED_BLOCKER     | Current Worker projector retractWallPost only UPDATEs existing entries; prior actual-DB out-of-order reproduction                         | Durable deletion evidence must suppress late/replayed creation; both orders, duplicates and rollback tested                                   |
| 068  | FIXED_VERIFIED        | Email verification destination invalidation/Worker serialization and accepted DB/HTTP cases                                               | Old credential cannot confirm a changed address                                                                                               |
| 069  | FIXED_VERIFIED        | Isolated leaderboard population and unchanged rank/tie assertions                                                                         | Unrelated E2E ledger fixtures cannot change expected ranking                                                                                  |
| 070  | FIXED_VERIFIED        | Viewer-safe batch followers/following/blockedUsers projection; accepted privacy HTTP tests                                                | Preserve owner visibility, order/count/pages; fail closed on evidence failure                                                                 |
| 071  | FIXED_VERIFIED        | Explicit viewer context and News engagement eligibility; accepted HTTP regressions                                                        | Denied targets cannot read/write engagement; accepted precheck/transaction race boundary retained                                             |
| 072  | FIXED_VERIFIED        | Media conditional assignment write and Serializable cleanup P2034 rollback; accepted DB interleavings                                     | No successful profile binding to cleanup-claimed file; batch rollback semantics retained                                                      |
| 073  | FIXED_VERIFIED        | D6 Turbo env/hash propagation and fail-closed skipped-test controls                                                                       | Required DB/Redis opt-ins execute rather than silently skip                                                                                   |
| 074  | FIXED_VERIFIED        | Controlled async presence fixture with exact owner privacy/timestamp assertions                                                           | Deterministic fixture without weakening timestamp/privacy contract                                                                            |
| 075  | FIXED_VERIFIED        | Accepted isolated achievements migrated schema and repeat/no-reset evidence                                                               | Previous test state cannot contaminate repeated full gates                                                                                    |
| 076  | FIXED_VERIFIED        | Accepted maxWorkers2 and real-config regression                                                                                           | Bound Web parallelism; not a new root-cause claim beyond 035 mitigation                                                                       |
| 077  | FIXED_VERIFIED        | Actual IntersectionObserver readiness, pause/resume event assertions, strict smoke                                                        | Remove timing sleeps while retaining real observer/event sequence                                                                             |
| 078  | FIXED_VERIFIED        | Exact generated Next declaration formatting exclusion and policy regression                                                               | Only generated path excluded; source formatting remains mandatory                                                                             |
| 079  | FIXED_VERIFIED        | PR99 accepted/merged a715ece; ten plain domain errors, owner/root mappers; PR94 rate-limit contract                                       | Preserve REST/GraphQL success/failure, unknown identity and refresh401; no broad exception framework                                          |
| 080  | FIXED_VERIFIED        | PR83 accepted/merged a35326a, CI smoke no-retry enforcement                                                                               | Mandatory smoke cannot turn red green through retries                                                                                         |
| 081  | FIXED_VERIFIED        | PR90 accepted/merged e26b0fc; runtime early-click lifecycle fix                                                                           | Pending timer survives accepted lifecycle; not attribution of every historical flake                                                          |
| 082  | FIXED_VERIFIED        | PR85 accepted/merged 05e177d; actual Editor/Jobs coverage graph                                                                           | All required test workspaces execute in full coverage mode                                                                                    |
| 083  | HISTORICAL_EVIDENCE   | Diagnostic PR87 accepted/merged ebd77b8; original natural-failure attribution unresolved                                                  | Retain first-failure evidence; no claim of separate proven active runtime bug                                                                 |
| 084  | HISTORICAL_EVIDENCE   | Report discloses missing original traces; controlled production issue corrected in 085                                                    | Preserve retention limitation; do not fabricate or require recovery of missing originals                                                      |
| 085  | FIXED_VERIFIED        | PR96 accepted/merged b41dd9e; production early-focus arrival correction and regressions                                                   | Early keyboard focus cannot be covered by delayed arrival; historical traces remain separate                                                  |
| 086  | HISTORICAL_EVIDENCE   | Diagnostic PR97 accepted/merged 8e3c4c7; original credential-rotation timeout cause unknown                                               | Current regression remains required; no runtime/crypto fix inferred from a passing run                                                        |
| 087  | FIXED_VERIFIED        | PR98 accepted/merged b63d555; shared validated smoke-port contract                                                                        | Quality runner, Playwright and tests use one explicit endpoint; fail closed                                                                   |
| 088  | FIXED_VERIFIED        | PR105 accepted/merged 5d6db1d; actual3200/3201 startup/CORS/links                                                                         | Configured dev ports work without changing Windows or default public contracts                                                                |
| 089  | FIXED_VERIFIED        | PR107 accepted/merged 701cb87; systeminformation patch correction                                                                         | Recorded Windows injection advisory patched; future audit separate                                                                            |
| 090  | CONFIRMED_BLOCKER     | Qualified owner O1/PR147 and Reputation P1/PR149 accepted; current legacy compatibility remains; root/Points/cycle integration unfinished | Late old-cycle delivery cannot restore retired effects end to end; new legitimate cycle remains eligible; same workstream as 007              |
| 091  | FIXED_VERIFIED        | PR110 accepted/merged 289b24c; strict bootstrap URL guard regressions                                                                     | Only no-query or exact schema=public accepted before install/deploy/seed                                                                      |
| 092  | FIXED_VERIFIED        | PR120 accepted/merged e6179f7, Joi advisory correction                                                                                    | Recorded email-splitting advisory patched; no new exception                                                                                   |
| 093  | FIXED_VERIFIED        | PR121 accepted into PR120 then main; sequential real Auth setup hooks                                                                     | Ledger scenario fits existing deadline without Auth mocks or weaker assertions                                                                |
| 094  | FIXED_VERIFIED        | PR144 accepted/merged 417fe99 including diagnostic145; atomic INITIATED→UPLOADING claim                                                   | One session winner, loser409 with no foreign cleanup; DB/HTTP/Redis regressions                                                               |
| 095  | HISTORICAL_EVIDENCE   | Diagnostic PR145 accepted inside PR144; local270s vs CI1.1s, later local1.3s                                                              | Cause remains unknown; green later gates are not a causal explanation or separate confirmed IAM defect                                        |

## Finite remaining work and actual blockers

Disposition totals: FIXED_VERIFIED76; CONFIRMED_BLOCKER3;
CONFIRMED_NON_BLOCKER2; HISTORICAL_EVIDENCE7; DEFERRED7; NEEDS_DECISION0.
These total95 IDs, not a percentage of remaining implementation effort.

Three `CONFIRMED_BLOCKER` rows represent **two implementation workstreams**, not
three independent redesigns: Activity067 and gamification007/090. One further
security finding,047, is explicitly deferred to the owner-model product phase.
None requires halting unrelated DSS product development. They block acceptance
of the corresponding guarantees; the old pre11 sequencing is a planning rule.

1. **047 decision, then minimal existing-IAM availability protection.** Current
   self-deactivation and IAM permission changes do not preserve a defined
   recovery predicate. A demonstrated irreversible total lockout is NOT claimed.
   Choose the required recoverable capability set and whether one active account
   must hold it. For an explicit new decision, recommend at least one ACTIVE
   account whose effective permissions include `users.read`, `roles.read`,
   `roles.create`, `roles.update`, `permissions.read`, and `permissions.manage`.
   This is a recovery baseline for existing IAM, not the future platform owner.
   Direct and role grants form one union; separate accounts with incomplete
   subsets do not satisfy it. Coordinate eligibility and destructive permission
   changes under shared transaction serialization. Do not add the future
   unique-owner/Command Deck product. The old six-key proposal is superseded;
   this narrow reuse needs explicit owner approval and is not silently accepted.
   Acceptance: allowed safe changes, denied last-recovery changes, concurrent
   destructive mutations, rollback and transport regressions. If the owner
   instead chooses explicit deferral, record the residual risk; do not label it
   FIXED_VERIFIED. This is the only new requirement decision requested by A.
2. **067 minimal Activity ordering correction.** Keep durable per-source
   retraction evidence using the existing model if sufficient; add only necessary
   persistence when required. Suppress delayed/replayed creation after deletion,
   without reading foreign aggregate tables or redesigning the event platform.
   Acceptance: delete-before-create, create-before-delete, repeated events,
   independent sources, failure rollback, existing feed behavior.
3. **007/090 finish the accepted automatic-gamification scenario.** Reuse A/B,
   qualified Achievements O1, Reputation producer P1, admission C2.1, Levels L1,
   and the Points source guard. Missing links are qualified Points outcomes and
   source-cycle provenance; producer/configuration coverage; invocation of owner
   effects through the existing admission/durable delivery path; recovery and
   explicit activation preflight. These are acceptance components of one finite
   scenario, not permission for unlimited proof/design packages. No historical
   replay/backfill, recalculation of old balances, new formulas or frontend.
   Acceptance: canonical new event→exact applicable effects; duplicate and
   out-of-order delivery; reversal before/after contribution; late old-cycle
   rejection and legitimate new-cycle qualification; restart/crash recovery;
   transaction rollback, owner isolation and required E2E. Preserve the accepted
   persisted UTC cutoff on Outbox.createdAt. Do not activate before acceptance.
4. **Historical disposition (Phase C).** Seven rows are HISTORICAL_EVIDENCE:
   requested058/059/083/084/086/095 plus the older registration timing048 found
   during the complete inventory. This is no new diagnostic task. Preserve
   unknown causes/missing artifacts, keep existing regressions, and stop unless
   there is new concrete evidence. 035/076 share an accepted worker mitigation;
   084/085 separate lost historical evidence from a fixed runtime cause.
5. **Final verification and closure (Phase D).** Run the unchanged full gate on
   final integration, review code, CI, migration compatibility and the changed
   guarantees; update the register and report residual risks/deferrals. No gate
   reruns solely to rediscover known history. Owner acceptance closes D7; it does
   not assert zero technical debt or complete future product phases.
6. **Bounded Stack Audit (Phase E).** Only after D7: actual installed/locked
   versions, compatibility, advisories, critical deprecations/breaking changes
   and production risks. Latest directive narrows the older broad stack plan;
   no technology replacement, mass upgrades or new architecture audit implied.

Historical 026 is a completion-wording qualification,036 an upstream behavior
limitation. Neither adds an implementation blocker. Six deferred IDs remain
009/017/018/019/037/039, with their limited scopes above. No new debt ID is opened.

## Approval boundary

The owner approved the finite list and chose deferral for047 after clarifying
the owner invariant. The six-key policy above is retained as the rejected interim
option, not an implementation requirement. Seven deferred IDs now include047.
Owner must not be deleted, banned, deactivated or deprived of administrative
authority by UI/API/background commands. SQL injection must be prevented using
parameterization and least privilege; unrestricted database-administrator access
is outside that guarantee. No hidden recovery account, backdoor or automatic
owner resurrection is requested. Implement these protections in the relevant
owner phase, not in this audit's067/007 packages. No full local gate was
repeated for this analysis-only result. Existing accepted receipts are retained
without relabelling them as fresh runs. No production readiness or final D7
acceptance is claimed by this matrix.
