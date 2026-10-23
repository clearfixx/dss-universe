# D7 — Individual debt review matrix

Date: 2026-10-23. Baseline: accepted main `f118d82`.
Status: **IN PROGRESS; not a release certificate**.

This covers every unique register ID001–079 exactly once. It does not say all
79 entries are resolved or fully reviewed. The [register](../development/DEBT_REGISTER.md)
retains authoritative implementation/decision status; the categories below are
review routing, not new debt statuses. Detailed inspected evidence and limitations
are in the [D7 review](D7_BASELINE_RELEASE_REVIEW.md). A historical green D6 gate
does not override the current dependency failure or missing risk decisions.

## Review categories

- C — scoped correction already accepted; exact D7 reconciliation/evidence mapped.
- M — current source/evidence mapped in part; remaining acceptance is explicit.
- R — additional individual source/test/contract reconciliation required.
- O — current open finding or unresolved stability observation; no waiver.
- Q — explicit owner/design decision required before implementation/disposition.
- X — explicit owner deferral; retained debt, not implemented parity.

## Complete ID routing

| ID       | Review | Evidence / remaining action                                                                                                                                                                  |
| -------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DEBT-001 | M      | Auth credential store and root registration/profile allowlists inspected; reconcile all lifecycle consumers and DB rollback evidence before broad closure.                                   |
| DEBT-002 | M      | Actual Auth/IAM application paths use owned ports; remaining semantic persistence ownership is not proved by the bounded ORM scan.                                                           |
| DEBT-003 | M      | Minimal Reputation/Points/Levels/Achievements ports, root adapters and private providers inspected; fresh composition16/16. Remaining semantic transactions not blanket-certified.           |
| DEBT-004 | M      | No direct Prisma/database imports in bounded non-infrastructure feature scan; root enum/mapping composition inspected,16 tests pass. Alias/transitive semantics require remaining review.    |
| DEBT-005 | M      | Current mandatory frozen-baseline/file-graph enforcement verified140/140,zero bounded findings; stale D2 rollout doc clarified. Domain/HTTP079 remains outside guarantees.                   |
| DEBT-006 | M      | Root README stale Phase2 corrected to current context/plan/register; docs index and historical phase/workflow redirects checked. Naming039 remains open.                                     |
| DEBT-007 | M      | Phase8 requirement assertions/main suites mapped; Activity-only Worker leaves automatic gamification007 unresolved. Not phase acceptance.                                                    |
| DEBT-008 | M      | Current groups/Premium/Guardian policy and migration guards inspected; fresh74 units/main HTTP5+5; full Phase5 acceptance separate.                                                          |
| DEBT-009 | X      | Owner deferred Passport cleanup/classification to future GPT-5.6 work; excluded from D5/D7.                                                                                                  |
| DEBT-010 | M      | Legacy backend/role examples explicitly redirect to current rules; not every old guidance file has been reviewed.                                                                            |
| DEBT-011 | M      | Current workflow/phase plan authority inspected and D7 resumption recorded; no new implementation authority inferred.                                                                        |
| DEBT-012 | M      | Primary declared API/Worker DB/Redis alignment verified without values; required auth keys present, explicit Media signing secret absent/dev fallback allowed. Not production readiness.     |
| DEBT-013 | O      | Current host Mailpit SMTP/HTTP readiness fails despite internal health; separate diagnosis/recovery requested.                                                                               |
| DEBT-014 | C      | Fresh authenticated gh status and actual repository/main/PR reads succeed; no token disclosure beyond masked CLI output.                                                                     |
| DEBT-015 | C      | Accepted consolidated quality:full runner/gate delivery; current security failure remains visible, not bypassed.                                                                             |
| DEBT-016 | O      | Fresh audit: two critical/two high/twelve moderate; three Next findings block, only exact braces exception approved.                                                                         |
| DEBT-017 | X      | LOCAL operational scope approved; MinIO/S3 adapter parity remains future debt, not pre11 prerequisite.                                                                                       |
| DEBT-018 | X      | News-local search approved; shared Search Platform remains future debt, not pre11 prerequisite.                                                                                              |
| DEBT-019 | X      | Historical Passport rendering repair retained; remaining cleanup/classification deferred outside D7.                                                                                         |
| DEBT-020 | C      | Exact API/two Worker portable guards and pre-IO variant validation inspected; fresh15+13 tests and accepted cross-OS CI. Physical037 separate.                                               |
| DEBT-021 | C      | Upstream shared builds, strict forced wrapper and actual Turbo controls reviewed; fresh40 policy tests and accepted D6 gates.                                                                |
| DEBT-022 | M      | Fresh repository format check exits0; old41-file count is stale, registry closure still to reconcile explicitly.                                                                             |
| DEBT-023 | C      | Buffer-backed Sharp metadata/source cleanup and fresh Worker13 tests; accepted cross-OS CI. No blanket Windows reliability claim.                                                            |
| DEBT-024 | M      | IAM evidence/Authorization decisions/root translation reviewed; Premium non-staff and audience-first verified. Future ACL/sanctions not claimed.                                             |
| DEBT-025 | M      | Canonical roadmap precedence and legacy-document warnings inspected; complete remaining source-index reconciliation.                                                                         |
| DEBT-026 | M      | Phase9/10 completion rows mapped to exact suites/source;057/066/067 and scheduler/SEO scope limits retained. Not blanket completion.                                                         |
| DEBT-027 | M      | Auth/IAM named roots and private Nest providers inspected; remaining public roots/technical-entry consumers need mapping.                                                                    |
| DEBT-028 | M      | Current Architecture Rules/ADR003/004 separate persistence from services; reviewed older drafts are marked historical.                                                                       |
| DEBT-029 | M      | Current Worker fail-fast source and fresh5-test environment suite pass; no new Worker start/delivery proof.                                                                                  |
| DEBT-030 | M      | API/Web defaults/examples and primary Web public endpoints agree on3001/api/graphql and /api; boolean-only env check, no app start.                                                          |
| DEBT-031 | M      | Full bootstrap read: preserve/exclusive-create env, pinned runtimes, coordinate guard before committed deploy/seed. Not executed or certified for arbitrary process overrides.               |
| DEBT-032 | M      | Full dev/test Compose read; actual pgAdmin digest matches source, loopback/health/profile scope checked. Current Mailpit host readiness remains013.                                          |
| DEBT-033 | M      | Optional collector absent/4318 unavailable as permitted; no persistent monitoring/export readiness claimed.                                                                                  |
| DEBT-034 | C      | Actual Sign in locator and /login journey plus accepted fresh/CI14-test smoke; no UI rewrite.                                                                                                |
| DEBT-035 | M      | API runInBand and Web maxWorkers2 inspected; scoped worker mitigation is not universal OOM root-cause proof.                                                                                 |
| DEBT-036 | M      | Fresh braces14/14; bounded authored-source scan shows no direct expansion path. Transitive pattern reachability/upstream error remain unresolved.                                            |
| DEBT-037 | Q      | Lexical-only containment confirmed; explicit trusted-local-writer versus hostile-writer policy question pending.                                                                             |
| DEBT-038 | C      | Accepted bounded30-minute quality workflow and terminal593-test E2E/main CI; no future capacity guarantee.                                                                                   |
| DEBT-039 | Q      | Owner naming override exists, but roadmap still reverses labels and Research Lab/Knowledge Forge scope reconciliation is unfinished.                                                         |
| DEBT-040 | O      | Current REST DTO type imports compile to Function metadata; field compatibility/validation correction needs separate packet.                                                                 |
| DEBT-041 | C      | Actual decoded IV/tag/ciphertext byte mutations inspected; fresh TOTP selection and accepted D6 gates pass.                                                                                  |
| DEBT-042 | M      | Fresh isolated PostgreSQL second-factor15/15: locks, single-use and rollback; owned schemas cleaned. Audit doubled; not fresh migration/HTTP acceptance.                                     |
| DEBT-043 | M      | Current request access replaces stale claims; exact same-JWT revoke/rename/delete HTTP case passes in main CI.                                                                               |
| DEBT-044 | C      | Accepted generator baseline/clean consistency evidence; unchanged SDL hash, not all generated-export architecture compliance.                                                                |
| DEBT-045 | C      | Owned migrated News/leaderboard schemas and finally cleanup; real view0-to1/global rankings preserved; exact main workflow cases pass.                                                       |
| DEBT-046 | M      | Fresh protected-role PostgreSQL7/7 including blocked competing revocations and synthetic storage rollback.047 availability remains distinct.                                                 |
| DEBT-047 | Q      | Current eligibility/permission changes lack shared availability policy; minimal pre11 design versus explicit deferral question pending.                                                      |
| DEBT-048 | M      | Actual87-HTTP scenario has30000ms per-test budget; exact main case passes2582ms. Distinct from30-minute CI job; historical stall root cause not certified.                                   |
| DEBT-049 | C      | Annotation-only schema alignment, unchanged54 migrations, fresh14-test source contract and accepted D6 catalog/drift evidence.                                                               |
| DEBT-050 | C      | Explicit awaited shared React cleanup and actual disposal probe; fresh1/1 and accepted D6 coverage/CI.                                                                                       |
| DEBT-051 | M      | Canonical attachment unwrap/gate exclusion inspected; exact main attachment E2E29/29; current gate acceptance separate.                                                                      |
| DEBT-052 | M      | Viewer-safe JSON precedes attachment projection; no raw fallback; main redaction E2E20/20.                                                                                                   |
| DEBT-053 | M      | Hybrid performance assertions inspected:250/1000 corpora, batches64, concurrency4, pages beyond500, fail-closed; main5/5. Not fresh D7 load/SLO certification.                               |
| DEBT-054 | M      | Related target eligibility applied before projection/order; exact main E2E12/12.                                                                                                             |
| DEBT-055 | C      | Correct package production entry, fresh1-test syntax/existence check and accepted D6 actual HTTP smoke.                                                                                      |
| DEBT-056 | M      | Eligible target before secondary Interactions read with empty denied totals; exact main E2E21/21.                                                                                            |
| DEBT-057 | O      | Current SDL rejects null tombstone body; owner approved separate post-review compatibility design, correction and HTTP regressions. Not implemented.                                         |
| DEBT-058 | O      | Historical5s document-tool timeout not root-caused; accepted worker mitigation does not erase distinct observation.                                                                          |
| DEBT-059 | O      | Windows schema-write intermittent failure not root-caused; later green gates are not a causal explanation.                                                                                   |
| DEBT-060 | M      | One-SQL population total and null-row stripping inspected; main ownership30/30 includes17 explicit total/viewer regressions.                                                                 |
| DEBT-061 | M      | Actual Worker bridge, canonical v1 markers/new DLQ and historical v2 retry/dedup inspected; main3/3. Not exactly-once or gamification delivery.                                              |
| DEBT-062 | M      | Event-before-quota lock/count/write inspected; main deterministic DB cap suite8/8; formal acceptance separate.                                                                               |
| DEBT-063 | M      | Fresh Jobs/Worker build and migrated diagnostic exit0: automatic READY, two blocked CAS contenders, quarantine and variant rollback; cleanup0 schemas/connections. Not global lease/live IO. |
| DEBT-064 | M      | Shared user/title synchronization and post-lock rereads inspected; main DB schedules/rollback7/7.                                                                                            |
| DEBT-065 | M      | PID+UUID token CAS and recovery invalidation inspected; main actual-DB/queue-double11/11; not exactly-once.                                                                                  |
| DEBT-066 | Q      | Malformed/deep TypeError/RangeError still reproduced; exact depth/compatibility policy remains unapproved.                                                                                   |
| DEBT-067 | Q      | UPDATE-only retraction cannot persist missing-source tombstone; separate ordering design question pending.                                                                                   |
| DEBT-068 | M      | Fresh verification PostgreSQL14/14 including destination/Worker interleavings and rollback; schema cleanup verified. Current HTTP case retained from main.                                   |
| DEBT-069 | C      | Leaderboards private population isolates unrelated ledger fixtures without changing ranking/tie assertions; main workflow passes.                                                            |
| DEBT-070 | M      | All three social page paths use batch viewer-safe projection; exact main privacy suite6/6; failed evidence denies.                                                                           |
| DEBT-071 | M      | Explicit viewer policy and main engagement31/31; approved precheck/separate-transaction race boundary retained.                                                                              |
| DEBT-072 | M      | Conditional physical assignment UPDATE and cleanup P2034 batch rollback inspected; main DB suites12/12+19/19.                                                                                |
| DEBT-073 | C      | Full wrapper/env/hash/result processor inspected; fresh40 controls include actual skipped-Jest rejection; accepted D6 full profile.                                                          |
| DEBT-074 | M      | Controlled presence touch and gated late persistence preserve exact owner timestamps/privacy; main6/6. No sleep or relaxed assertions.                                                       |
| DEBT-075 | C      | Accepted owned migrated fixture/repeat/no-reset full-suite verification; original assertions preserved.                                                                                      |
| DEBT-076 | C      | Accepted bounded Web workers/config regression and unchanged timeout/coverage; scoped mitigation only.                                                                                       |
| DEBT-077 | C      | Accepted actual-observer readiness correction and fresh/CI smoke; no runtime/UI or retry-to-green change.                                                                                    |
| DEBT-078 | C      | Accepted exact generated-path format exclusion and actual Prettier policy regression.                                                                                                        |
| DEBT-079 | Q      | Ten inherited Domain/Nest HTTP exception dependencies confirmed; separate error/transport-preserving design scope required.                                                                  |

## Execution order from this checkpoint

1. Finish R entries by original acceptance contract, starting with runtime
   security paths and fixture/gate enforcement. M entries still need their
   stated residual scope before broad closure.
2. Obtain Q decisions and separately approved016/013 corrections. Do not
   implement them in this documentation-only review or silently defer O risks.
3. Finish current secret/event/log/transport allowlist review and remaining
   architecture/public-surface reconciliation.
4. Consolidate final full gate/CI against the actual corrected source, then
   owner review. No red merge, stack audit or Phase11 entry follows this matrix.
