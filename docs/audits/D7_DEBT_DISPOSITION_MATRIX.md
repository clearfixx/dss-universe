# D7 — Individual debt review matrix

> Historical checkpoint. Current authoritative statuses and completion: [Final D7 closure](FINAL_D7_CLOSURE.md), 2026-11-17.

> Historical 91-entry matrix from `81e0a65`, integrated on 2026-11-15 for
> traceability. These routes and counts are not a current closure verdict.
> Later debts and owner decisions are recorded in the
> [current register](../development/DEBT_REGISTER.md) and
> [integration checkpoint](D7_INTEGRATION_CHECKPOINT_2026-11-15.md).
> No old M/O/Q/X route is promoted by merging this historical matrix.

Updated: 2026-10-29. Current accepted baseline: `289b24c`; initial review baseline
was `f118d82`.
Status: **IN PROGRESS; not a release certificate**.

Latest checkpoint: PR110834ea0b is accepted and merged289b24c: CI5/5, local
full gate0, E2E688/688, build6/6, Web15/15 without retries. Scoped091 is routeC.
Confirmed sleep during the successful local gate is disclosed in the review;
no uninterrupted/performance claim. Inventory001–091 is in accepted history.
D7 remains open; PR109 is not accepted or imported.

Earlier checkpoint: PR108cd40325 is accepted and merged as ddb685d; CI5/5,
local full gate0, E2E688/688 and Web15/15 without retries. DEBT-090 policy is
approved: new legitimate qualification cycles may qualify under current rules;
late old-cycle events must not restore revoked awards. Detailed C1 protocol
PR10910c09eb is a separate unaccepted proposal, not a runtime correction.
Inventory90 now includes the accepted register entry090; D7 remains open.

Earlier checkpoint: owner accepted DEBT-013 PR106a24bb2a/mergecc39080,
CI5/5 and its own full gate0, E2E686/686, Web15/15 without retries; scoped013
operational readiness/preservation resolved. Candidate090 is characterized in
C design PR1080d51145; full gate/CI and owner acceptance remain pending, no
runtime consumer or owner correction imported into this review branch.

Earlier override: owner accepted DEBT-089 PR10756ed7da/merge701cb87,
CI5/5, full gate0, audit0 high/critical, E2E686/686, Web15/15 without retries.
013 integration heada24bb2a is under its own new full gate/CI; its host protocols
and preservation are verified, but candidate acceptance remains open.

Earlier override: owner accepted DEBT-088 PR105b0aabaa/merge5d6db1d,
CI5/5 and local full gate0, E2E686/686, Web15/15. Mailpit12525/18025 and
preservation are verified, but PR10631b8e1c acceptance is blocked by new089
security advisory. PR10756ed7da has CI5/5/full gate0 and audit0 high/critical;
owner acceptance/merge is pending. Neither candidate code is imported here.

Earlier checkpoint: owner accepted PR102/103 design and runtime B PR104c146c60,
mergedc6b5417: CI5/5, full gate0, API1466/1466, E2E686/686 without skips,
Web15/15 without retries.007 remains M for C/D/activation; bounded B persistence
is accepted, not automatic delivery. Fresh013 bind preflight identifies Windows
exclusion2428–2527 blocking2525;12525/18025 are available. Message count2/unread2
and opaque-ID fingerprint are preserved. No service restart occurred. Current
readiness remains M until a configurable-port recovery is implemented/verified.
Older readiness and B-not-implemented statements below are historical checkpoints.

Current reconciliation: owner accepted PR100 design head846dd94, merged625d1b9,
with CI5/5 and local full gate0 on identical runtime/test sources. The
owner approved a persisted UTC cutoff with Outbox.createdAt >= cutoff and no
automatic historical replay. Package A is separately approved for owner-local
assemblies/narrow consumers and lifecycle isolation, not queue/routing activation.
It is not implemented by D7. Scoped022 formatting and029 environment verification
are now route C, with exact evidence/limits in the review.
Fresh Mailpit host2525/18025 probes fail despite healthy container/configured
bindings, so current013 readiness is route M, without erasing accepted PR91.
Owner accepted PR87e6c4e44/mergeebd77b8: CI5/5, E2E658/658 without skips and
local full gate0 on identical code, Web15/15. First-failure evidence policy is
integrated; historical natural-failure attribution remains separate. Package A.1
cleanup is additionally accepted in PR1017a8abbe/merge2c42e89: CI5/5 and full
gate0, API1463/1463, E2E661/661, Web15/15 without retries. Only A/A.1 is accepted;
automatic delivery and routing/activation remain open.
D7 has no new full gate.

Owner accepted DEBT-079 runtime PR99 `ae1b516`, merged `a715ece`:
CI5/5 and uninterrupted full gate0, API1450/1450, E2E658/658, Web15/15.
This is scoped route C for the ten Domain errors and presentation boundaries;
broader application Nest usage and unrelated stability observations are not waived.

Owner accepted delivery design/characterization PR92 `4da51b6`, merged `f9ddeeb`:
CI5/5 and full gate0, API1337/1337, E2E648/648, Web15/15 without retries.
DEBT-007 remains route M for unimplemented runtime delivery/history decisions.

Owner accepted Editor validation PR89 `d8ab9c9`, merged `4ad31b9`:
CI5/5 and local full gate0, API1336/1336, E2E646/646, Web15/15 without retries.
DEBT-066 is scoped route C; earlier verification-open references are historical.

Latest scoped acceptance: owner accepted PR94 `9672731`, merged `393e359`,
with CI5/5 and uninterrupted local full gate0, E2E623/623 and Web15/15.
DEBT-079 remains route M for unimplemented Domain decoupling; earlier pending
PR94 references below are historical, superseded only for that narrow mapping.

Latest override: owner accepted DEBT-087 PR98 `b65df03`, merged `b63d555`:
CI5/5 and local full gate0, strict E2E623/623, Web14/14 on3195 without retries.
Owner also accepted PR96 integration `6b1c6ca`, merged `b41dd9e`: CI5/5 and
local full gate0, E2E623/623, Web15/15. DEBT-086 is not resolved by either package.

Earlier override: owner accepted detailed design-only PR95 `82ebba0`, merged
`46395a7`: CI5/5 and local full gate0, E2E623/623, Web14/14 without retries.
DEBT-079 actual Domain decoupling remains open and is not implemented.

Earlier scoped acceptance: owner accepted diagnostic PR97 `0a7594e`, merged `8e3c4c7`.
Final CI5/5, API623/623, Web14/14 without retries; identical code had local full
gate0. This accepts diagnostics only; the timeout cause remains open (route O).

Earlier scoped acceptance: owner accepted DEBT-079 design/characterization PR93, merged as
`a8c71fa`, with exact-head CI5/5 and local full gate0, E2E623/623, Web14/14.
Domain decoupling remains unimplemented; separate rate-limit mapping PR94 is
under verification, not accepted. DEBT-007 PR92 integration head `b3eab76` has
green CI and strict E2E612/612; its earlier local Turbopack startup failure is
unresolved, and no new-head local full-gate success is claimed.

Current acceptance override: DEBT-040/057/081/082 are scoped accepted packages
(PR80/81/90/85 respectively). The dated routing rows below retain historical
evidence and are being reconciled, not claims that these merges are pending.
DEBT-066 mapping is approved and implemented in PR89 `a528c90`, CI5/5; local
full gate and integration with accepted PR81 remain open. See the latest
[acceptance checkpoint](D7_BASELINE_RELEASE_REVIEW.md) before older row text.

This covers accepted-register IDs001–091 exactly once.
It does not say all91 entries are resolved or fully reviewed. The [register](../development/DEBT_REGISTER.md)
retains authoritative implementation/decision status; the categories below are
review routing, not new debt statuses. Detailed inspected evidence and limitations
are in the [D7 review](D7_BASELINE_RELEASE_REVIEW.md). A historical green D6 gate
does not override missing risk decisions or accept an unmerged candidate.

## Review categories

- C — scoped correction already accepted; exact D7 reconciliation/evidence mapped.
- M — current source/evidence mapped in part; remaining acceptance is explicit.
- R — additional individual source/test/contract reconciliation required.
- O — current open finding or unresolved stability observation; no waiver.
- Q — explicit owner/design decision required before implementation/disposition.
- X — explicit owner deferral; retained debt, not implemented parity.

## Complete ID routing

| ID       | Review | Evidence / remaining action                                                                                                                                                                                                                                                                               |
| -------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DEBT-001 | M      | Auth credential/enrollment/profile composition plus deactivate/reactivate/email/password/session paths inspected. Accepted full-gate cohort90/90 maps DB/HTTP allowlists, rollback and invalidation; no new run. Last-admin047, timeout086 and final D7 acceptance remain separate.                       |
| DEBT-002 | M      | Auth and all five actual IAM service paths use owned ports; included in fresh compiler-resolved537-feature inventory with zero direct Prisma/database references. Infrastructure ORM remains owned; semantic persistence review and final acceptance are separate.                                        |
| DEBT-003 | M      | Minimal owner-local ports/private providers inspected; fresh composition47/47 and migrated DB/HTTP24/24, including recipient failure rollback. Automatic gamification delivery007 and broad acceptance remain separate.                                                                                   |
| DEBT-004 | M      | Fresh compiler-resolved inventory:537 feature files plus18 explicit Core/root business files;1478 literal static references,zero direct Prisma/database references or parse errors,zero dynamic calls in selected source. Transitive/inferred type exposure and final acceptance remain separate.         |
| DEBT-005 | M      | Current mandatory frozen-baseline/file-graph enforcement verified140/140,zero bounded findings; stale D2 rollout doc clarified. Domain/HTTP079 remains outside guarantees.                                                                                                                                |
| DEBT-006 | M      | Root README stale Phase2 corrected to current context/plan/register; docs index and historical phase/workflow redirects checked. Naming039 remains open.                                                                                                                                                  |
| DEBT-007 | M      | A/A.1 accepted PR101; B accepted PR104c146c60/mergec6b5417, CI5/5/full gate0, API1466/1466, E2E686/686, Web15/15. Routing persistence is accepted; C/D, queue consumption, activation and automatic delivery remain open.                                                                                 |
| DEBT-008 | M      | Membership validity/revocation, Premium non-staff, explicit Guardian and migration/history guards re-inspected. Accepted52-case cohort maps current capability/document behavior; no new run or complete Phase5/11 acceptance.                                                                            |
| DEBT-009 | X      | Owner deferred Passport cleanup/classification to future GPT-5.6 work; excluded from D5/D7.                                                                                                                                                                                                               |
| DEBT-010 | M      | Legacy backend/role examples explicitly redirect to current rules; not every old guidance file has been reviewed.                                                                                                                                                                                         |
| DEBT-011 | M      | Current workflow/phase plan authority inspected and D7 resumption recorded; no new implementation authority inferred.                                                                                                                                                                                     |
| DEBT-012 | C      | Effective API/Worker local DB/Redis alignment, Auth key presence and documented development signing fallback verified at2026-10-29T04:36:21Z; accepted supporting gates mapped in review. Production and arbitrary overrides excluded.                                                                    |
| DEBT-013 | C      | Owner accepted PR106a24bb2a/mergecc39080: actual SMTP/Nodemailer12525, UI18025, same image/volume/two original messages and other-container timestamps; CI5/5 and own full gate0, E2E686/686, Web15/15. Earlier failure preserved.                                                                        |
| DEBT-014 | C      | Fresh authenticated gh status and actual repository/main/PR reads succeed; no token disclosure beyond masked CLI output.                                                                                                                                                                                  |
| DEBT-015 | C      | Consolidated runner accepted; its later workspace-coverage omission082 and legitimate no-retry failure083 remain separately visible.                                                                                                                                                                      |
| DEBT-016 | C      | Owner accepted PR84, merged089c52f; seven blocking advisories corrected, exact-head CI5/5 and local full gate pass. Historical moderate17/low2 and unchanged braces patch remain explicit.                                                                                                                |
| DEBT-017 | X      | LOCAL operational scope approved; MinIO/S3 adapter parity remains future debt, not pre11 prerequisite.                                                                                                                                                                                                    |
| DEBT-018 | X      | News-local search approved; shared Search Platform remains future debt, not pre11 prerequisite.                                                                                                                                                                                                           |
| DEBT-019 | X      | Historical Passport rendering repair retained; remaining cleanup/classification deferred outside D7.                                                                                                                                                                                                      |
| DEBT-020 | C      | Exact API/two Worker portable guards and pre-IO variant validation inspected; fresh15+13 tests and accepted cross-OS CI. Physical037 separate.                                                                                                                                                            |
| DEBT-021 | C      | Upstream shared builds, strict forced wrapper and actual Turbo controls reviewed; fresh40 policy tests and accepted D6 gates.                                                                                                                                                                             |
| DEBT-022 | C      | D7 repository-wide Prettier exit0 and generated-path guard1/1 confirm accepted D6 formatting; historical41-file count superseded. No bulk Passport compliance claimed.                                                                                                                                    |
| DEBT-023 | C      | Buffer-backed Sharp metadata/source cleanup and fresh Worker13 tests; accepted cross-OS CI. No blanket Windows reliability claim.                                                                                                                                                                         |
| DEBT-024 | M      | IAM-owned facts/root translation/Authorization decisions verified against code and accepted HTTP/DB assertions. Audience precedes Premium numeric bypass; no generic staff inflation. No atomic multi-read snapshot or future ACL/owner/sanction implementation claimed.                                  |
| DEBT-025 | M      | Canonical roadmap precedence and legacy-document warnings inspected; complete remaining source-index reconciliation.                                                                                                                                                                                      |
| DEBT-026 | M      | Phase9/10 completion rows mapped to exact suites/source;057/066/067 and scheduler/SEO scope limits retained. Not blanket completion.                                                                                                                                                                      |
| DEBT-027 | M      | Auth/Users/IAM roots, Nest tokens and enrollment consumers inspected; fresh17 boundary/registration +24 allowlist/DB tests. Remaining roots/technical consumers need mapping.                                                                                                                             |
| DEBT-028 | M      | Current Architecture Rules/ADR003/004 separate persistence from services; reviewed older drafts are marked historical.                                                                                                                                                                                    |
| DEBT-029 | C      | Env-file scripts/template inspected; fresh environment5/5; compiled entry with missing DATABASE_URL exits1 with0 guarded TCP attempts. Scoped environment acceptance, not valid Worker delivery007 or Mailpit013 readiness.                                                                               |
| DEBT-030 | C      | Approved local override3200/3201 verified through Web/GraphQL/API, exact credentialed CORS and reset/verification links; defaults/examples3001 retained. Scope is current local development endpoints.                                                                                                    |
| DEBT-031 | M      | Full bootstrap read: preserve/exclusive-create env, pinned runtimes, coordinate guard before committed deploy/seed. Not executed or certified for arbitrary process overrides.                                                                                                                            |
| DEBT-032 | C      | Configured dev/test images, exact loopback bindings and running state match; configured healthchecks healthy, pgAdmin digest and HTTP200 verified (no pgAdmin healthcheck). Mailpit/ClamAV host readiness checked; not global uptime.                                                                     |
| DEBT-033 | M      | Optional collector absent/4318 unavailable as permitted; no persistent monitoring/export readiness claimed.                                                                                                                                                                                               |
| DEBT-034 | C      | Actual Sign in locator and /login journey plus accepted fresh/CI14-test smoke; no UI rewrite.                                                                                                                                                                                                             |
| DEBT-035 | M      | API runInBand and Web maxWorkers2 inspected; scoped worker mitigation is not universal OOM root-cause proof.                                                                                                                                                                                              |
| DEBT-036 | M      | Fresh braces14/14; bounded authored-source scan shows no direct expansion path. Transitive pattern reachability/upstream error remain unresolved.                                                                                                                                                         |
| DEBT-037 | M      | Owner requires physical containment against hostile local symlink/junction substitution before Phase11. Trusted-writer deferral rejected; separate API/Worker IO inventory and race-safe platform design required. No runtime correction yet.                                                             |
| DEBT-038 | C      | Accepted bounded30-minute quality workflow and terminal593-test E2E/main CI; no future capacity guarantee.                                                                                                                                                                                                |
| DEBT-039 | M      | Owner confirms one Wiki named Research Lab; Knowledge Forge is legacy alias. Canonical labels and module map reconciled; historical Phase12 feature inventory preserved. Technical IDs/routes/scheduling await Phase11 brainstorm; no runtime/UI rename.                                                  |
| DEBT-040 | C      | Owner accepted PR80 head0c4a5c8, merged d452cdd; exact CI5/5 and local full gate0, E2E607/607, Web14/14 without retries. REST optional displayName and concrete DTO metadata verified.                                                                                                                    |
| DEBT-041 | C      | Actual decoded IV/tag/ciphertext byte mutations inspected; fresh TOTP selection and accepted D6 gates pass.                                                                                                                                                                                               |
| DEBT-042 | M      | Fresh isolated PostgreSQL second-factor15/15: locks, single-use and rollback; owned schemas cleaned. Audit doubled; not fresh migration/HTTP acceptance.                                                                                                                                                  |
| DEBT-043 | M      | Current request access replaces stale claims; exact same-JWT revoke/rename/delete HTTP case passes in main CI.                                                                                                                                                                                            |
| DEBT-044 | C      | Accepted generator baseline/clean consistency evidence; unchanged SDL hash, not all generated-export architecture compliance.                                                                                                                                                                             |
| DEBT-045 | C      | Owned migrated News/leaderboard schemas and finally cleanup; real view0-to1/global rankings preserved; exact main workflow cases pass.                                                                                                                                                                    |
| DEBT-046 | M      | Fresh protected-role PostgreSQL7/7 including blocked competing revocations and synthetic storage rollback.047 availability remains distinct.                                                                                                                                                              |
| DEBT-047 | Q      | Current eligibility/permission changes lack shared availability policy; minimal pre11 design versus explicit deferral question pending.                                                                                                                                                                   |
| DEBT-048 | M      | Actual87-HTTP scenario has30000ms per-test budget; exact main case passes2582ms. Distinct from30-minute CI job; historical stall root cause not certified.                                                                                                                                                |
| DEBT-049 | C      | Annotation-only schema alignment, unchanged54 migrations, fresh14-test source contract and accepted D6 catalog/drift evidence.                                                                                                                                                                            |
| DEBT-050 | C      | Explicit awaited shared React cleanup and actual disposal probe; fresh1/1 and accepted D6 coverage/CI.                                                                                                                                                                                                    |
| DEBT-051 | M      | Canonical attachment unwrap/gate exclusion inspected; exact main attachment E2E29/29; current gate acceptance separate.                                                                                                                                                                                   |
| DEBT-052 | M      | Viewer-safe JSON precedes attachment projection; no raw fallback; main redaction E2E20/20.                                                                                                                                                                                                                |
| DEBT-053 | M      | Hybrid performance assertions inspected:250/1000 corpora, batches64, concurrency4, pages beyond500, fail-closed; main5/5. Not fresh D7 load/SLO certification.                                                                                                                                            |
| DEBT-054 | M      | Related target eligibility applied before projection/order; exact main E2E12/12.                                                                                                                                                                                                                          |
| DEBT-055 | C      | Correct package production entry, fresh1-test syntax/existence check and accepted D6 actual HTTP smoke.                                                                                                                                                                                                   |
| DEBT-056 | M      | Eligible target before secondary Interactions read with empty denied totals; exact main E2E21/21.                                                                                                                                                                                                         |
| DEBT-057 | C      | Owner accepted PR81 heada554f41, merged746d981; CI5/5 and local full gate0, strict E2E610/610, generated-client check/build and Web14/14 without retries. Nullable tombstones preserve history.                                                                                                           |
| DEBT-058 | O      | Historical5s document-tool timeout not root-caused; accepted worker mitigation does not erase distinct observation.                                                                                                                                                                                       |
| DEBT-059 | O      | Windows schema-write intermittent failure not root-caused; later green gates are not a causal explanation.                                                                                                                                                                                                |
| DEBT-060 | M      | One-SQL population total and null-row stripping inspected; main ownership30/30 includes17 explicit total/viewer regressions.                                                                                                                                                                              |
| DEBT-061 | M      | Actual Worker bridge, canonical v1 markers/new DLQ and historical v2 retry/dedup inspected; main3/3. Not exactly-once or gamification delivery.                                                                                                                                                           |
| DEBT-062 | M      | Event-before-quota lock/count/write inspected; main deterministic DB cap suite8/8; formal acceptance separate.                                                                                                                                                                                            |
| DEBT-063 | M      | Fresh Jobs/Worker build and migrated diagnostic exit0: automatic READY, two blocked CAS contenders, quarantine and variant rollback; cleanup0 schemas/connections. Not global lease/live IO.                                                                                                              |
| DEBT-064 | M      | Shared user/title synchronization and post-lock rereads inspected; main DB schedules/rollback7/7.                                                                                                                                                                                                         |
| DEBT-065 | M      | PID+UUID token CAS and recovery invalidation inspected; main actual-DB/queue-double11/11; not exactly-once.                                                                                                                                                                                               |
| DEBT-066 | C      | Owner accepted PR89 d8ab9c9, merged4ad31b9: CI5/5, local full gate0, API1336/1336, E2E646/646 without skips, Web15/15 without retries. Malformed/depth65 rejection and valid depth64 plus approved local error mapping verified.                                                                          |
| DEBT-067 | Q      | UPDATE-only retraction cannot persist missing-source tombstone; separate ordering design question pending.                                                                                                                                                                                                |
| DEBT-068 | M      | Fresh verification PostgreSQL14/14 including destination/Worker interleavings and rollback; schema cleanup verified. Current HTTP case retained from main.                                                                                                                                                |
| DEBT-069 | C      | Leaderboards private population isolates unrelated ledger fixtures without changing ranking/tie assertions; main workflow passes.                                                                                                                                                                         |
| DEBT-070 | M      | All three social page paths use batch viewer-safe projection; exact main privacy suite6/6; failed evidence denies.                                                                                                                                                                                        |
| DEBT-071 | M      | Explicit viewer policy and main engagement31/31; approved precheck/separate-transaction race boundary retained.                                                                                                                                                                                           |
| DEBT-072 | M      | Conditional physical assignment UPDATE and cleanup P2034 batch rollback inspected; main DB suites12/12+19/19.                                                                                                                                                                                             |
| DEBT-073 | C      | Full wrapper/env/hash/result processor inspected; fresh40 controls include actual skipped-Jest rejection; accepted D6 full profile.                                                                                                                                                                       |
| DEBT-074 | M      | Controlled presence touch and gated late persistence preserve exact owner timestamps/privacy; main6/6. No sleep or relaxed assertions.                                                                                                                                                                    |
| DEBT-075 | C      | Accepted owned migrated fixture/repeat/no-reset full-suite verification; original assertions preserved.                                                                                                                                                                                                   |
| DEBT-076 | C      | Accepted bounded Web workers/config regression and unchanged timeout/coverage; scoped mitigation only.                                                                                                                                                                                                    |
| DEBT-077 | C      | Accepted actual-observer readiness correction and fresh/CI smoke; no runtime/UI or retry-to-green change.                                                                                                                                                                                                 |
| DEBT-078 | C      | Accepted exact generated-path format exclusion and actual Prettier policy regression.                                                                                                                                                                                                                     |
| DEBT-079 | C      | Owner accepted runtime PR99 ae1b516, mergeda715ece: CI5/5, uninterrupted full gate0, API1450/1450, E2E658/658 without skips, Web15/15; mapper100%. Interrupted656/658 and sleep evidence retained; no broad Nest cleanup claimed.                                                                         |
| DEBT-080 | C      | Owner accepted test/CI-only PR83, mergeda35326a. Exact headbde1ad6: CI5/5, local gate0, E2E593/593 and Web14/14 without retries. Does not fix early-interaction081 or React083.                                                                                                                           |
| DEBT-081 | C      | Runtime package approved and accepted: PR90 head29b0803, mergede26b0fc; CI5/5, local gate0, E2E607/607 and Web14/14 without retries. Controlled lifecycle regression fixed; not attribution of every natural flake.                                                                                       |
| DEBT-082 | C      | Owner accepted PR85 integration head8cc1e50, merged05e177d; CI5/5, local gate0, coverage8/8 including Editor, E2E607/607 and Web14/14. Both quality policies preserved.                                                                                                                                   |
| DEBT-083 | O      | Owner accepted diagnostic PR87e6c4e44/mergeebd77b8, CI5/5/full gate0 on identical code, E2E658/658/Web15/15. First-failure evidence is integrated; red77ea28d and exact natural-failure attribution remain unwaived.                                                                                      |
| DEBT-084 | M      | Historical failure summary/observations remain; original local raw traces/context are unavailable (retention errata). New controlled production comparison is archived outside output cleanup. No test-only fix or acceptance claimed.                                                                    |
| DEBT-085 | C      | Owner accepted PR96 integration6b1c6ca, merged b41dd9e: CI5/5 and local full gate0, E2E623/623, Web15/15 without retries. New production hashes verified after cleanup; missing old traces and historical failures remain explicit.                                                                       |
| DEBT-086 | O      | Owner accepted diagnostic PR97 head0a7594e, merged8e3c4c7: CI5/5, API623/623, Web14/14; identical code local full gate0. AgentReporter explains suppressed passing logs, not the original timeout. Cause/correction remain open.                                                                          |
| DEBT-087 | C      | Owner accepted PR98 b65df03, merged b63d555: shared validated smoke port, fail-closed bind guard, actual config/Turbo controls; CI5/5 and local full gate0, E2E623/623, Web14/14 on3195. No Windows/runtime/timeout/assertion change.                                                                     |
| DEBT-088 | C      | Owner accepted PR105b0aabaa, merge5d6db1d; actual startup/readiness/GraphQL/CORS verified, CI5/5 and local full gate0, E2E686/686, Web15/15. Earlier sleep-interrupted raw log retained; no broad stability waiver.                                                                                       |
| DEBT-089 | C      | Owner accepted PR10756ed7da/merge701cb87: patch-only dependency, audit0 high/critical, CI5/5/full gate0, E2E686/686, Web15/15. Mailpit integration subsequently accepted separately in PR106.                                                                                                             |
| DEBT-090 | M      | Accepted PR108 characterization confirms legacy rollback ordering gap. Owner approved new legitimate cycles under current rules and rejecting late old-cycle restoration. Detailed C1 protocol PR109 and runtime correction remain unaccepted/unimplemented; no production incident or concurrency claim. |
| DEBT-091 | C      | Owner accepted PR110834ea0b/merge289b24c. Exact query policy and separate CLI/API-local views verified: CI5/5, full gate0, E2E688/688, Web15/15. Confirmed sleep disclosed; scoped guard closure only.                                                                                                    |

## Execution order from this checkpoint

DEBT-084 is routed M: original raw traces/context were lost, with retention errata
preserved; new controlled production evidence is archived outside cleanup. It is
not recovery of the original artifacts or an accepted test-only fix.
DEBT-085 is scoped C after accepted PR96 integration6b1c6ca/mergeb41dd9e and its
full gate/CI proofs. That acceptance does not resolve original artifacts or086.
DEBT-086 is routed O: approved diagnostics did not reproduce that deadline;
there is no proven test/fixture correction. None is a release waiver.

1. Finish R entries by original acceptance contract, starting with runtime
   security paths and fixture/gate enforcement. M entries still need their
   stated residual scope before broad closure.
2. Obtain Q decisions; resolve090/source-order policy and other Q decisions;013/089/016 are accepted. Do not
   implement them in this documentation-only review or silently defer O risks.
3. Finish current secret/event/log/transport allowlist review and remaining
   architecture/public-surface reconciliation.
4. Consolidate final full gate/CI against the actual corrected source, then
   owner review. No red merge, stack audit or Phase11 entry follows this matrix.
