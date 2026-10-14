# DEBT-053 — Viewer-safe News-local search

Date: 2026-10-14. Status: IN PROGRESS; runtime correction wired locally, final acceptance open.
Priority: High; release/Phase 11 security blocker until verified correction.

## Authority and package boundary

The owner approved a separate correction after DEBT-052, preserving permitted
body search, totals, pins, pagination and existing data without creating Search
Platform. The owner subsequently approved the hybrid architecture with
performance tests and **no hidden result limit**. This document records that
decision; it does not close the debt.

Work branch: `debt/debt-053-news-viewer-search`, based on DEBT-052 commit
`0ecdbb14188f4d14bfd8469fe2f159f67e762060`. The draft PR stacks on
`debt/debt-052-full-news-redaction`; parent PRs are not accepted. No red merge.
During this increment another task added its own localization document commit
`3fb28c4` on the shared checkout. It is preserved, not authored or reverted here;
DEBT-053 changes must be staged explicitly rather than sweeping the worktree.
That task also pushed the shared branch at `3fb28c4`; read-only GitHub inspection
found no PR for this branch at the foundation/storage checkpoint. Runtime work is
now prepared for draft publication with the red gates and acceptance limits below.
DEBT-054 related-audience filtering and DEBT-051 canonical attachments remain
separate packages, in that order after this one. No frontend design, new owner
rights, Command Deck functionality or unrelated D4 ownership rewrite.

## Why the existing query is unsafe

News stores the generic Editor search projection, including contentGate payloads.
`PrismaNewsDeliveryRepository.where` matches that field before returning lists
and counts. The migrated AppModule characterization in
`news-viewer-redaction.e2e-spec.ts` demonstrates a guest finding a synthetic
hidden-only marker even though Full News already redacts it. Returning no hidden
body in the list does not remove this match/count oracle.

## Approved hybrid and ownership

1. Editor owns canonical text semantics. Derive a policy-independent public
   projection by omitting every contentGate payload, preserving the same empty
   gate separator as actual denied delivery. Normalize the complete visible text
   with the existing Node NFKC/uk-UA algorithm, not each block independently.
   Return only public search text and whether gates exist, never gate definitions.
2. News owns its stored search projection and query plan. Persist public text and
   gate presence atomically with each canonical create/save; version the derived
   data so stale or missing indexes cannot silently become authoritative. Keep
   the authored document and private full projection unchanged.
3. Guests use only public projection/metadata matching: no viewer-policy calls
   or per-request document corpus scan. Ungated documents use the same fast lane
   for authenticated viewers. Preserve current language/audience/publication,
   category/tag/homepage/featured filters and database substring semantics.
4. For authenticated viewers, inspect eligible gated documents in bounded
   batches through Editor/ContentAccess-owned redaction before count or page
   selection. Public title/summary matches are definitive; public **body**
   matches are not definitive for gated documents. Root composition connects
   News-owned ports to named Editor contracts; no IAM/ContentAccess SQL or parser
   appears in News. No raw-text prefilter of gated candidates.
5. Compute the complete matching set before selecting the existing maximum
   twenty pins, excluding those pins from ordinary totals, offset/cursor reads
   and hasNextPage. Batching bounds memory/concurrency, not result cardinality.
   Keep ordering and existing pin scope/expiry semantics. Provider failures
   reject the operation rather than returning partial totals or raw fallbacks.

### Non-monotonic phrase matching

With public `alpha`, denied `secret`, then public `gamma`, the visible projection
contains `alpha gamma`; the raw projection does not. Conversely, when that gate
is allowed, the public-only match `alpha gamma` can disappear. Therefore neither
raw authored text nor public-only body text is a sound final shortcut for
authenticated gated documents. Test both directions, including nested gates and
inline Unicode compositions. Metadata matches do not depend on gate payloads.

### Persistence, existing data and consistency

Use a forward migration and an explicit bounded Node/Editor backfill. A batch
must compare the source document/version before installing its projection so a
concurrent edit cannot publish a stale index. Validate canonical NEWS documents;
malformed stored data requires explicit repair, never a raw-text fallback. Report
only IDs/counts, not protected text, in operational errors. Activation must check
projection completeness/freshness; migration alone is not backfill acceptance.

The query's persistence implementation must keep article eligibility, complete
match decisions, pin selection, count and page membership consistent. Prefer a
private repeatable-read snapshot and transaction-local match relation over an
unbounded in-memory ID list. No transaction/client crosses a module contract.
Verify PostgreSQL temporary-relation permissions and Prisma connection lifetime
before adopting that detail; do not quietly raise timeouts or truncate results.
ContentAccess remains the live authority for membership, expiry and bypass; do
not persist viewer decisions in the public index or cache them across requests.

## Normalization investigation

Read-only differential probes against the current disposable PostgreSQL and
Node 24 runtime found that database normalization is not interchangeable with
Editor normalization. Node reports ICU 78.3 / Unicode 17.0. Of 6,363 code points
changed by Node NFKC/lowercase, PostgreSQL NFKC plus uk-x-icu lowercase disagreed
on 37 (including newer outlined Latin characters). Pre-decomposing with Node
NFKD then applying PostgreSQL NFC/lowercase still disagreed on 20 of 18,114
changed code points, including newer canonical compositions. These are local
probe results, not a claim that all PostgreSQL installations behave identically.

Keep whole-document normalization in Editor/Node. PostgreSQL may perform the
existing case-insensitive substring comparison on the resulting string. Verify
`%`, `_`, backslash and quote behavior against current Prisma contains queries;
do not silently substitute JavaScript includes or change query normalization.
The [PostgreSQL string-function documentation](https://www.postgresql.org/docs/17/functions-string.html)
and [collation documentation](https://www.postgresql.org/docs/17/collation.html)
describe the database-side functions/locale context, not equivalence to Node.

An additional read-only probe observed the actual Prisma query as
`searchText ILIKE ('%' || $2 || '%')`, with the search string passed unchanged.
Synthetic `%`/`_` patterns, escaped underscore/backslash and quotes matched the
same parameterized PostgreSQL expression. Uppercase Greek `ΣΟΣ` did not match
lowercase final-sigma `σος` in the current database; outlined Latin input was not
query-normalized into ASCII. Preserve these current comparison semantics in
the correction rather than silently substituting JavaScript string matching or
normalizing the query. The test role has TEMP privilege; `pg_trgm` is available
but not installed. No extension or index was installed by this probe.

## Acceptance and performance evidence

- Pure Editor invariants: ungated compatibility; hidden text, labels and IDs
  absent; denied placeholder equivalence; nested/repeated gates; whole-document
  whitespace, cross-block phrases, cross-inline combining characters and modern
  Unicode normalization; no mutation or access to denied descendants.
- Migrated real AppModule: guest/member/author/Premium/GROUP decisions, numeric
  thresholds, grant/revoke/expiry observed on subsequent requests, nested gates,
  provider failures and missing/stale projection fail-closed behavior.
- Search response evidence: hidden-only marker gives no item/pin/count; visible
  phrase found after redaction; newly allowed payload can invalidate that phrase;
  correct totals/pins/pages/cursors with matches beyond a batch/page boundary.
- Existing-data backfill, optimistic conflict/retry and malformed-document
  diagnostics; atomic create/save rollback with audit/outbox intact.
- Performance corpora of 250 and 1,000 mixed gated/ungated articles: compare guest
  fast lane with authenticated gated work; record document/policy call counts,
  bounded batch/concurrency, plans, p50/p95 and memory. No flaky elapsed-time-only
  unit assertion; no undisclosed 500-result cap or post-pagination filtering.
- Full workflow gates: changed/global format, Passports, architecture/licenses,
  Prisma validation/generation/migration status, lint/types, full opt-in units,
  coverage, focused/full API E2E and Web smoke, generated GraphQL, production
  build, audit, patch regressions, CI and review. Record known red baselines
  without waivers, broad restores, disabled triggers or frontend changes.

## Implementation checkpoint

The architecture is approved. At the first checkpoint, the shared Editor public projection, NEWS-pinned
search contract/private adapter and root binding to a News-owned port are in
place. No feature imports another feature's concrete service or gate policy.
The viewer projection delegates to existing redaction, then normalizes only
the permitted document. Existing Full News delivery is unchanged. These changes
were the first increment, before runtime query wiring. The local query correction
now exists as described below; DEBT-053 remains unaccepted until the complete
response/performance and workflow matrix is reviewed.

### First-increment verification

- Shared Editor: 23 tests PASS, including 14 new projection cases; build/lint PASS.
- Focused API: 30 tests PASS across five suites, including 19 new owner/root tests.
- Migrated AppModule: 29 E2E PASS across two suites, including nine new projection
  boundary cases and twenty unchanged Full News cases. Real GROUP/Premium,
  numeric policy, author bypass, grant/revoke/expiry and provider-outage behavior;
  isolated schemas from all 53 migrations, no dev/production writes. The existing
  DEBT-053/054 disclosure characterizations still pass and remain unresolved.
- Full direct API units with all four DB/Redis opt-in flags: 819/819 PASS,
  132 suites, no skipped tests. The preceding Turbo strict-env run passed only
  727 and skipped 92 opt-ins; it was not reported as full DB/Redis evidence.
- Web 59, Worker 36, Storage 43 and Editor 23 units PASS through sequential Turbo.
- Root lint/typecheck PASS. Lint rerun followed correction of three new async mock
  callbacks without awaits; no rule suppression. Typecheck had five unchanged
  cached prerequisite tasks and four fresh tasks.
- Architecture fixtures 52/52 PASS; frozen inventory stays at 89 existing
  findings. Only the two named Editor search contract symbols were added to its
  public surface expectation; no private service or persistence waiver.
- Editor dependency-license check, 14 dependency-patch regressions, changed-file
  formatting and `git diff --check` PASS. Canonical schema.gql and generated/Web
  sources remain untouched after migrated E2E.

An initial direct Vitest invocation used the repository root instead of the
package root and was stopped; subsequent sandboxed package tests failed before
assertions on temporary-file EPERM. The approved normal execution route passed
all package tests. A new E2E-conformance unit fixture initially used an invalid
empty text node; it now uses the canonical empty paragraph, without loosening
validation. The SQL probe's initial expectation of a pre-wrapped Prisma parameter
was corrected after observing its actual server-side concatenation. These failed
setup/fixture/probe attempts are not hidden or counted as passing checks.

- Sequential production build PASS: six tasks, four unchanged cached outputs;
  Web and API built fresh. Global formatting remains RED on the same 41 legacy
  files (DEBT-022); no bulk reformat or waiver. Modified files pass separately.

The first-increment results above precede the storage increment below. Coverage,
full API/Web E2E, audit, generated checks, final build/CI/review and publication
must be rerun for the complete package. No implementation commit/PR or
security-closure claim yet.

### Storage and operational backfill increment

News now owns `NewsSearchProjection`: public text, gate presence, source version
and projection version. Draft create/save persist it in the existing atomic unit
of work with revision/references/audit/outbox. A forward migration invalidates the
projection whenever document JSONB or currentVersion changes, including
same-version direct edits. Metadata/publication-only updates do not invalidate it.
The private backfill repository checks both JSONB source and version under a row
lock before installation. Missing/incompatible projections are traversed with
bounded keyset reads; conflicts and a complete remaining count are reported.
Invalid canonical documents stop with only a repair-required article ID, never
raw-text fallback or protected validation payloads.

The named `NEWS_SEARCH_INDEX_MAINTENANCE` exposes readiness and resumable backfill,
not a concrete repository/service or new HTTP/Command Deck endpoint. The CLI uses
installed metadata-preserving ts-node and deferred named composition loads;
dispatcher, retention and News scheduler switches are set to zero before loading
AppModule. No new dependency or production API compiler setting is introduced.
An attempted separate CommonJS/Node-resolution config could not resolve exported
workspace package types; it was removed, not bypassed with transpile-only mode.

Run from the API workspace through `pnpm --filter @dss/api db:news-search check`.
For a reviewed target, use `backfill --confirm-database=<configured-db-name>` and
optional `--batch-size=1..250` (default 64; not a corpus/result cap). Remote targets
need `--allow-remote` **and separate operational approval**; no remote command was
run here. The CLI child exits 0 when ready, 2 when work remains, 1 on failure;
pnpm's script wrapper may normalize non-zero status while reporting the child
exit code. Output contains only counts/target name or an invalid source ID.

Verification to this checkpoint:

- Prisma validation/client generation PASS; 54 migrations, the new one deployed
  only to loopback disposable dss_test:5434. Existing authored News count (one)
  and aggregate document fingerprint were identical before/after migration.
- 56 migrated E2E PASS across four suites: ten new storage/backfill tests,
  seventeen updated transaction rollback/idempotency tests, nine search-port and
  twenty Full News tests. Actual row-lock contention is observed before the
  competing edit commits; the waiting installer rechecks and rejects stale JSON.
  Existing-data repair crosses ten batches (70 rows), is idempotent, and retains
  immutable history triggers. Projection counts and values roll back with the
  failed evidence transaction. Invalid-source test repairs only its synthetic
  fixture explicitly, not arbitrary legacy authored data.
- Focused units PASS: 30 tests for storage coordination/News/composition, then
  34 for backfill/operational arguments/composition. API typecheck and explicit
  source+CLI ESLint PASS after fixing fixture JSON types/changeSummary, typed mock
  references and argument-table shape. No lint/type suppression.
- Architecture fixtures 52 PASS and frozen inventory remains 89 existing findings.
- Real CLI readiness initially reported one missing projection (child exit 2).
  Reviewed `backfill --confirm-database=dss_test --batch-size=7` processed/installed
  that one existing synthetic row, with zero conflicts/remaining. Authored News
  fingerprint stayed identical. A second readiness command reported zero, exit 0.

The storage checkpoint above preceded runtime wiring; it did not resolve search.

### Local runtime and response increment

`PrismaNewsSearchSession` now owns one repeatable-read persistence snapshot and
a transaction-local matching relation (`ON COMMIT DROP`). Article eligibility,
projection readiness, matching, pin selection, total, page/cursor and bounded
hydration use that snapshot. No ORM callback leaves News infrastructure. The
legacy delivery repository retains unchanged non-search/full/rating/comment paths
and known Users/Interactions ownership debt; no waiver is added for the new path.

Guests match only public title/summary/projection text without loading canonical
documents or calling policy. Authenticated search scans all eligible gated body
candidates except definitive public metadata matches, by ID in batches of 64.
At most four documents are projected concurrently through the existing semantic
port. Completed evidence is compared by parameterized PostgreSQL ILIKE, not JS
matching. No raw-text prefilter, corpus cap, cross-request viewer cache or new
Search Platform. Failed projection chunks are fully drained, then fail with a
generic error; partial totals and protected provider diagnostics are not returned.
Missing/stale eligible projections reject search until canonical maintenance,
without preventing unchanged non-search reads. The existing twenty-pin maximum
is preserved; additional qualifying pins remain ordinary results.

Evidence to this checkpoint:

- Eleven real GraphQL/query E2E PASS: guest hidden-only pins/items/count, both
  non-monotonic phrase directions, author/GROUP/Premium, grant/revoke/expiry,
  metadata shortcut, provider outage/recovery, missing/source/algorithm evidence,
  SQL wildcard/escape/quote/Unicode comparison, all existing filters, and concurrent
  publication/document/pin changes with consistent old-snapshot hydration.
- Twenty Full News E2E PASS after converting the positive search disclosure into
  a denial regression. Its intentionally malformed synthetic source is now restored
  and backfilled in finally so later search-readiness tests do not inherit it.
  The related-metadata disclosure remains a positive DEBT-054 characterization.
- Isolated real-policy performance/pagination: three E2E PASS, corpora of 250/1,000
  articles with 150/600 gated. Five samples per lane; guest projection calls zero,
  member exactly one per gated article per request, concurrency maximum four.
  Correct 980 ordinary results plus twenty pins, page six/page ten and successive
  cursor/tail reads; no hidden 500-result cap. Public plans use owned taxonomy/PK
  indexes; this is not a trigram/GIN index or a production load-test claim.
- Local p50/p95 milliseconds: 250 guest 107/162, member 960/1280; 1,000 guest
  97/113, member 3283/3657. Public plan execution approximately 1.725/6.667 ms.
  Member RSS delta across five 1,000-row requests was about 143.8 MB; heap/RSS
  samples include GC/runtime noise and are not a proved leak or peak-memory bound.
- The earlier concurrent DB-gate run hit the unchanged 5,000 ms transaction
  budget at 5,150/5,490 ms for the 600-gate corpus. A storage/backfill fixture also
  exceeded its existing test timeout; later assertions inherited unfinished work.
  The isolated repeat passed without a code/timeout change. This demonstrates
  limited capacity margin, not a resolved concurrency/performance risk. Final
  acceptance must disposition it; do not increase timeout or truncate matches.
- Eight snapshot coordination units PASS, with 100% statements/functions/lines and
  94.11% branches locally measured. The narrowed coverage command correctly exited
  red because it omitted existing mandatory Auth/Users/IAM files; it is not a full
  coverage-gate pass. New explicit thresholds are added without lowering old ones;
  final complete coverage must be rerun. Typed Jest mocks follow the installed
  two-generic API after lint/typecheck caught an initially incompatible signature.
- Before those eight units, complete API coverage with all four DB/Redis opt-ins:
  848 PASS, 134 suites, zero skipped. Other workspace units PASS via unchanged
  Turbo cache: Editor 23, Storage 43, Web 59, Worker 36. Root build PASS: six tasks,
  fresh API and five unchanged cached outputs; Prisma validation PASS.
- Architecture fixtures 52 PASS and inventory stays 89, with no widened baseline.
  An initial helper default passed the entire Prisma client; it now selects only
  the concrete owned News delegate and the existing characterization passes.
- Global format remains RED on 41 legacy files; audit RED on one high/ten moderate;
  fourteen dependency-patch regressions and Editor license check PASS. Generated
  consistency still adds only the inherited barrel lint comment (DEBT-044). Web
  smoke executes thirteen tests: ten PASS, three unchanged Enter Station failures.
  No frontend correction, dependency update or generated workaround is included.

Final current API units/coverage: **856 PASS**, 135 suites, zero skipped, all four
DB/Redis opt-ins and all six service/file coverage thresholds enforced. The final
root lint/typecheck and explicit maintenance-CLI ESLint pass after typed mock fixes.
Changed documentation formatting and `git diff --check` pass.

The full API E2E attempt reports 232 PASS / 12 FAIL across 29 suites (24 PASS,
five FAIL). Failed suites: app registration timeout, News foundation (DEBT-045),
reputation/profile-assets hook timeouts, achievements and leaderboards. Other
heavy local gates overlapped part of this run; causality is not established.
All **70 relevant E2E PASS** within this full attempt: storage 10, performance 3,
search query 11, projection boundary 9, Full News 20, atomic transactions 17.
The earlier concurrent focused-run failures are not erased by these later results.
Do not classify all failures as pre-existing without isolated reproduction.
No test skip, protection-trigger disable, result truncation, forceExit or timeout
increase is introduced. The local implementation is not a green accepted package.
The runner retained open handles after printing/writing its complete summary;
only its verified Jest PID was stopped after checking no active test DB queries.
Zero owned api_boundary schemas remained. Browser/codegen generated side effects
were inspected and restored exactly; canonical schema.gql and Web remain unchanged.

Publish only as a draft, with exact red-gate evidence; do not merge or close the debt.
Next: review/disposition performance and full-suite failures before acceptance.
DEBT-054/051 remain separate;
no Phase 11 implementation or stack replacement is authorized by this increment.
