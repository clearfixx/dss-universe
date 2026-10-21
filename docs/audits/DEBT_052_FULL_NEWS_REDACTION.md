# DEBT-052 — Full News server-side viewer redaction

Date: 2026-10-14. Branch: `debt/debt-052-full-news-redaction`.
Base: published `5851381` / draft D4 PR #10, whose parent PR #9 is unaccepted.
Status: corrective implementation in place; local gates below, CI/review and
release acceptance OPEN. No red PR is merged; Phase 11 is not started.

## Corrected response boundary

The previous actual unauthenticated Full News response returned synthetic denied
Content Gate text in documentJson. The independent Editor delivery removed it,
but the publication path bypassed that projection. The disclosure expectation
now requires absence, not preservation, of denied content in the public response.

Editor publishes `EDITOR_VIEWER_DOCUMENT_PROJECTOR`, a named minimal contract
accepting authored JSON and an opaque viewer ID or null. Its private application
adapter delegates to existing canonical validation/redaction and returns only
safe documentJson, not canonical unredacted content, gate definitions, verdicts,
credentials, user profiles or an ORM transaction.

News owns `NEWS_VIEWER_DOCUMENT_READER`; root Content composition binds it through
an explicit field-selecting adapter. News does not import Editor implementations,
IAM, Auth or ContentAccess internals and does not duplicate the gate policy.
The existing decision-only provider remains the policy source.

News application reads an eligible full article first. Missing/inaccessible
articles short-circuit projection and metadata. It then projects the document
for this viewer and uses only safe JSON for the response and attachment input.
The final spread explicitly replaces the authored JSON. Provider failures reject
the full response; invalid stored legacy nodes fail canonical validation, never
fall back to raw content. No cross-request viewer cache is introduced.

Synchronous invalid-address errors, existing article visibility, GraphQL fields,
query ordering and independent metadata composition remain. No existing database
transaction is split, no snapshot guarantee is invented and stored documents are
not redacted destructively. No Prisma schema/migration/dependency, frontend or
owner/Command Deck change is included. Backend guidance preserves the current
NestJS architecture and private-service/public-contract distinction.

## Runtime evidence

Twenty new migrated AppModule cases exercise actual root bindings, canonical News
creation, current IAM membership use cases, PostgreSQL and Redis. Eighteen are
security/compatibility checks; two explicitly characterize separate adjacent
disclosures (DEBT-053/054), not passing security acceptance for those channels.

- Guest denial removes synthetic protected text while stored authored content
  remains unchanged; repeated gate IDs are evaluated once within the request.
- Ordinary members follow current numeric thresholds, including the zero boundary.
- Authors bypass numeric requirements only within the mandatory allowed audience;
  a subsequent guest never receives that result.
- Mandatory GROUP denies Premium and author outside the audience. Fixtures use
  actual `group:<key>` custom-group identities rather than bare legacy role keys.
- Matching ordinary group membership does not bypass numeric thresholds.
- Premium bypasses numbers in an allowed group. Revocation of Premium or audience
  membership is effective with the same JWT; expired membership is not effective.
- Nested allowed/denied gates are pruned recursively. Denied attachment labels
  and media IDs are absent before metadata composition.
- Editor and decision-provider failures produce rejected application reads and
  GraphQL error/null, with no metadata read or successful raw/partial response.
- Missing and MEMBERS-only articles short-circuit before Editor for guests.
- Malformed stored noncanonical doc nodes fail closed. Ordinary canonical News
  retains public document, summary, template and response fields.
- The supported comment write path rejects gated COMMENT and wrong NEWS-profile
  documents before persistence; ordinary comments succeed and can be read.

The existing 25 attachment tests remain. Their invalid DB doc-node fixtures are
replaced with canonical storage plus direct tests of the owned attachment
component's legacy node input. This retains READY/PUBLIC/reference exclusion,
labels/checksums/order and real metadata failure coverage without making malformed
public documents a compatibility requirement. PostgreSQL JSONB property ordering
is compared structurally, not as an authored string-order guarantee.

DEBT-051 canonical manifest omission remains explicitly reproduced through the
public API. Full News metadata transport is not claimed repaired before its
separate approved package. Component metadata tests are not binary authorization
tests. No production policy provider is mocked into successful authorization.
Only unused Shiki highlighting is substituted; real presence refreshes are awaited.

## Gates and commands

| Gate                            | Evidence                                                                                            |
| ------------------------------- | --------------------------------------------------------------------------------------------------- |
| Runtime                         | Node 24.18.0 / pnpm 11.9.0; Docker and isolated loopback test services healthy                      |
| Focused pure tests              | 21 PASS in three suites; six new cases, including private Editor adapter validation/field selection |
| Full API units/integration      | 130 suites / 800 PASS, all DB/Redis opt-ins enabled                                                 |
| Web / Worker / Storage units    | 59 / 36 / 43 PASS, bounded workers                                                                  |
| Focused E2E                     | 45 PASS in two suites; includes three explicit unresolved behavior/disclosure characterizations     |
| Full API E2E                    | 25 suites / 211 tests executed: 24 suites and 210 tests PASS, one existing DEBT-045 failure         |
| Coverage                        | API 708 PASS / 92 opt-ins separately verified; Web/Worker/Storage PASS, thresholds unchanged        |
| New private projection adapters | Eight of eight statements covered in each adapter; not whole-platform security proof                |
| Root lint/typecheck             | PASS, fresh API plus unchanged cached packages                                                      |
| Prisma                          | Validate/generate/status PASS; all 53 existing migrations applied to fresh disposable DB; seed PASS |
| Production build                | PASS, serial concurrency one; fresh API plus five unchanged cached builds                           |
| Architecture/license            | PASS, 52 fixtures; unchanged 89 findings, no additions/exemptions or baseline widening              |
| Dependency patch regressions    | 14 PASS; not an audit waiver                                                                        |
| Global format                   | RED: same 41 legacy files after own formatting; DEBT-022                                            |
| Dependency audit                | RED: one high / ten moderate, DEBT-016; no dependency update or exception                           |
| Generated consistency           | RED: only known generated barrel eslint-disable comment, DEBT-044; own side effect restored         |
| Web smoke                       | RED: 10 PASS / 3 FAIL; existing Enter Station locator mismatch, no frontend correction              |
| CI/review                       | OPEN; evaluate the separate correction head independently after publication                         |

Commands use the workflow's actual matrix, with heavyweight runs serialized or
bounded. Scoped coverage uses API Jest in-band and Web/Worker with two workers;
the DB/Redis opt-ins are separately proven in the full 800-test run. No test skip,
threshold reduction, rule suppression, forceExit or OS/heap change is introduced.

Full API E2E again encounters DEBT-045: News-foundation expects viewCount null
but receives zero; cleanup tries to delete an interaction target protected by its
retirement trigger. All assertions finish and Jest prints the complete 211-test
summary, then reports open handles. Only that owned local test run is interrupted
after the summary. No DB protection is disabled, and full E2E is not green.

The new Editor/News response projection does not change that repository or the
legacy News fixture. A fresh disposable DB with all migrations and seed provides
stronger current baseline evidence, not permission to weaken those assertions.

## Adjacent findings and acceptance limits

DEBT-053: public News-local search matches synthetic text inside a denied gate,
returning the article and a non-zero total although Full News now removes the text.
A distinct absent-marker control returns zero. This is a search-match/count oracle,
not an arbitrary hidden-content dump. The owner approved a separate viewer-safe
search package after DEBT-052, preserving permitted search/total/pins/pagination
and existing data; no shared Search Platform is silently introduced.

DEBT-054: the supported authorized link command connects PUBLIC and MEMBERS-only
articles. A guest gets null for the member article but receives its synthetic
headline/slug in the public source's related block. The owner approved a separate
audience-correct related-summary package after DEBT-053. No target full document
is returned by this reproduction. Both positive characterizations remain release
findings, not acceptance of those channels.

Source review also distinguishes standalone allowlisted post templates and public
Media delivery from document gating. Public original/variant access remains Media's
responsibility; this package does not claim gated attachments become private media.
Editor preview consumes client-supplied JSON rather than loading stored News.
Supported COMMENT validation is tested, but arbitrary legacy/tampered records are
not certified. Chronological neighbor candidates are restricted to PUBLIC in the
existing repository; that observation is not exhaustive audience acceptance.

## Environment and generated-file hygiene

Docker Desktop was initially stopped; it was started without reset/reinstallation.
Existing dev services remained healthy. Separate `dss-universe-test` services use
127.0.0.1:5434/6380; migrations and seed target only disposable dss_test. Read-only
post-E2E inspection finds zero owned api_boundary schemas. The legacy failed
public-schema fixture is retained for D6 diagnosis, not silently deleted.

An initial root-cwd E2E command generated an untracked root src/schema.gql duplicate.
Only that own generated artifact was removed. The canonical apps/api/src/schema.gql
is unchanged at 1839 lines, Git blob `98bd7ebc8691b9751a3a783d2520de7d6bbc22ef`.
Subsequent E2E commands run in apps/api (directly or through pnpm --filter).
Generated-check modifies only the previously clean Web barrel with the inherited
lint comment; that own side effect is restored after exact diff inspection.

Initial Web smoke cannot launch Chromium revision 1248. Its installation to C:
fails ENOSPC; read-only free-space check reports approximately 0.77 GiB on C:
and 116.6 GiB on F:. No user files or other browser caches are deleted. A retry
uses ignored project node_modules/.cache on F: for both runtime and temporary
downloads, with process-local environment only. The pinned Chromium headless
runtime, FFmpeg and Winldd install successfully without removing other caches.
The second smoke run executes all thirteen tests: ten pass, three fail because
the Enter Station link is absent (DEBT-034). Browser launch is now proven; full
Web gate is not green. No frontend fix or unrelated visual debugging follows.

The verification skill separates the API response proof from browser smoke:
the UI News route consumes Full News JSON, but these existing browser tests cover
landing/shell behavior, not the protected-News viewer matrix. Do not substitute
ten smoke passes for an actual authenticated News UI security proof.

Next dev rewrites its generated block in apps/web/AGENTS.md. The exact 3+/1-
diff matches installed Next's generate-agent-files.js; after owned smoke processes
finish, only that own generated side effect is restored. No authored frontend,
AGENTS instructions, generated schema or codegen changes are included in the PR.

The baseline D4 head 5851381 Quality run 38524807669 is verified IN_PROGRESS at
API E2E; its lint/types/schema/coverage pass, Web smoke/audit fail and separate
Windows/Linux storage run 38524807667 passes. It is not a terminal failure or a
green correction-head result; no CI restart/cancellation is performed.

## Next sequence

Publish this separate corrective draft PR with exact gate evidence; do not merge
red checks. Continue approved DEBT-053, then DEBT-054, then separate DEBT-051.
Resume remaining D4 ownership work, D4.4/D4.5 and D5–D7. Stop before Phase 11 for
the mandatory owner-approved brainstorm. Local response correction is not full
release acceptance or completion of the persistent pre-Phase-11 goal.
