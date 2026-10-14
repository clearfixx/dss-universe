# DEBT-054 — Viewer-safe Full News related summaries

Date: 2026-10-14. Status: IN PROGRESS; separate owner-approved security package.

## Authority and baseline

The owner approved this correction after DEBT-053, before DEBT-051. The package
removes related metadata for articles unavailable to the current viewer and
preserves eligible ordering and link semantics. It does not introduce generic
ACL, additional staff authority, frontend design or shared Search Platform.

Branch: `debt/debt-054-related-audience`, explicitly stacked on published
DEBT-053 `086aae38a9422df139b604c956cd2352792c9589` / draft PR #12. The parent
and earlier PRs are unaccepted; this is a review dependency, not a merge waiver.
At start both parent CI workflows are in progress. Its final local full E2E is
244 PASS/2 FAIL (DEBT-045); baseline format/audit/generated/Web gates stay open.
The owner-authored untracked stack-audit plan is preserved separately.

## Evidence and design

`findFullBySlug` reads eligible source articles through the News delivery
predicate (PUBLISHED, non-null publishedAt, PUBLIC for guests; PUBLIC/MEMBERS for
authenticated viewers). Its outgoing-link relation currently checks only
PUBLISHED, exposing MEMBERS-only title/slug/summary to guests.

Reuse that same owned predicate in the outgoing-link target query, with the
current viewer and without source language/category/search filters. Filter in
persistence before selecting target metadata, not by fetching protected
summaries and removing them in presentation. Existing position/createdAt ordering,
RELATED/CONTEXTUAL/SERIES types, anchors and display-date fallback are retained.
Cross-language related links remain supported. No new dependency, ORM contract,
migration or public GraphQL shape is necessary.

Only the existing PUBLIC/MEMBERS article policy is claimed. Generic access-group
ACL and future owner-visible deleted content are separate product work. Authenticated
viewer identity comes from the existing optional JWT guard; no role-name checks.
This correction does not make the multi-query Full News read an ACID snapshot or
change chronology, editorial link management or authored inline hyperlinks.

## Verification and acceptance

1. Add a real AppModule/GraphQL regression over an owned migrated schema; first
   demonstrate failure on the unchanged repository.
2. Correct the existing disclosure characterization to require absence of
   denied metadata. Test direct and related eligibility together.
3. Test guests/members, mixed ordering, all three link kinds, cross-language
   links, date fallback, live PUBLIC/MEMBERS changes, all unpublished states,
   missing publication time and audience-ineligible sources. No successful
   authorization decisions are mocked.
4. Run full opt-in API coverage, relevant/full API E2E, format, lint, typecheck,
   Prisma validation/generation, production build, architecture/license and
   dependency checks. Report all baseline red gates without skips or weakening.
5. Review diff, preserve canonical schema/frontend/owner document, commit, push
   and create a separate draft PR against DEBT-053. Record exact CI SHA/status.

Implementation, successful local checks and owner acceptance are distinct.
DEBT-053/054/051 and D4/D5–D7 remain open until their own acceptance requirements
are met. No Phase 11 implementation or stack audit starts here.

## Execution evidence

Baseline with the production repository unchanged: 12 new GraphQL E2E execute,
8 PASS/4 FAIL. Failures reproduce guest member-summary disclosure, the mixed-link
guest list, a PUBLISHED target without publishedAt but with displayPublishedAt,
and live PUBLIC-to-MEMBERS disclosure. All unpublished-state exclusions and
member ordering/metadata assertions pass before the correction. The isolated
schema closes normally, with no forced runner exit.

Initial test authoring caught and corrected a wrong Prisma delegate name and
tuple inference during typecheck before the baseline E2E; no type suppression
or generated code modification was used. Correction reuses `where({ viewerId })`
on the nested target relation; no duplicate visibility rule is introduced.
The inherited positive disclosure characterization now requires absence.

Corrected focused GraphQL run: **73 PASS**, five suites, zero skipped, normal
exit in 52.481 seconds. Includes related 12, Full News redaction 20, search query
11, search performance 5 and attachment ownership 25. All 12 new cases pass;
the original four failures are now green without changing their expectations.
Full opt-in API coverage: **890 PASS**, 137 suites, zero skipped, all eight
existing thresholds enforced unchanged.

Final verification on the unchanged production correction:

| Gate                          | Actual result                                                                      |
| ----------------------------- | ---------------------------------------------------------------------------------- |
| Root lint/typecheck           | PASS; fresh API, unchanged workspace cache hits                                    |
| Prisma validation/generation  | PASS; schema and 54 migration files unchanged                                      |
| Production build              | PASS; fresh API, five unchanged cached outputs                                     |
| Architecture/license/baseline | PASS; 52 fixtures, 89 known findings, no additions/waivers                         |
| Other workspace units         | Fresh Editor 23, Storage 43, Worker 36, Web 59 PASS; coverage for the latter three |
| Changed formatting/diff       | PASS                                                                               |
| Global format                 | FAIL on 41 inherited files; no mass formatting                                     |
| Dependency audit/patches      | FAIL: one high/ten moderate; all 14 patch regressions PASS                         |
| Generated GraphQL consistency | FAIL: inherited generated `eslint-disable` comment drift, DEBT-044                 |
| Web smoke                     | 10 PASS/3 FAIL: existing Enter Station visibility failures, DEBT-034               |

The full API E2E uses the verified owned tmpfs PostgreSQL on 5435, recreated from
the committed Compose file: zero public tables before all 54 migrations, no seed.
Only earlier synthetic test data in that owned container was replaced; 5434/dev
databases were not reset. Result: **256 PASS/2 FAIL**, 28/30 suites, 258 tests,
zero skipped, 238.870 seconds. All 12 related regressions and the prior 72
search/Full News/storage/projection/atomic cases pass in this full run.

Failures: News's viewCount null-versus-zero/retirement-trigger cleanup, and the
registration/GraphQL viewer test exceeding its unchanged five-second timeout.
Both have earlier recorded DEBT-045 evidence, but this is not proof of every
failure's root cause. A subsequent isolated **entire Auth suite: 26 PASS** in
27.871 seconds, zero skipped, normal exit. This supports an intermittent test
failure; it does not turn the failed full run green or prove why it timed out.
Other workspace gates overlap the later full-run interval; no causal claim or
capacity measurement is derived from that loaded run. The earlier 73-case
focused run is separate evidence. No timeout, assertion or DB protection changed.

Full E2E writes its complete failing JSON then retains open handles. After zero
owned schemas/active DB queries and exact runner command verification, only its
owned Jest PID was stopped; this is not a successful full-suite process exit.
GraphQL/Next dev side effects in generated `gql/index.ts` and `AGENTS.md` were
inspected and restored exactly to the clean package baseline; the generated
barrel blob hash matches HEAD. No authored frontend or canonical schema diff.
The browser check stops at the existing broken UI boundary, without frontend fixes.

Ignored local evidence is in `node_modules/.cache/dss-debt-054-*` (baseline,
focused/full/isolated-auth E2E JSON; unit JSON/logs; architecture/format/audit/
GraphQL/Web/workspace logs). Owner acceptance, independent review and this
package's CI remain OPEN. Publish as draft only, not a closed release blocker.
