# D4.3d3b — Owned News delivery snapshot

Date: 2026-10-14; verification resumed 2026-10-15. Status: locally implemented; full gates, review, CI and owner
acceptance open. This is not full D4 acceptance or Phase 11 work.

Branch `debt/d4-news-owned-snapshot` starts from published DEBT-056 `b403455`
(draft PR #15). Parents remain unaccepted and are not merged. The owner approved
this read ownership/Repeatable Read direction before implementation; priority
DEBT-056 was implemented first in its separate package. DEBT-057 remains open.

## Ownership and composition

| Boundary                      | Ownership after this increment                                                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| News technical reader         | Article eligibility/content, categories/tags/pins, links, cursor/numbered selection and navigation; only newsArticle delegate and owned relations |
| News search selector          | Existing owned raw SQL/match relation, complete viewer-safe selection and live Editor batches                                                     |
| Users technical reader        | Distinct-ID batch selecting only id, username, displayName, avatarUrl, avatarMediaId                                                              |
| Interactions technical reader | Targets/aggregates, viewer reaction/bookmark, non-deleted comment/view counts, share groups, vote pages and comment root/reply tree               |
| Root read unit                | Operation transaction and allowlisted response composition; no owner SQL moved into root                                                          |
| News application              | Validation, viewer document redaction and public attachment composition remain outside persistence as before                                      |

`NEWS_DELIVERY_READER` is a News-owned semantic input port with explicitly named
operations/results and no ORM/Nest request contract. It replaces the transitional
delivery repository injection; News no longer registers/exports that repository
provider. Root assembly binds the semantic port and keeps technical adapters
private. Named infrastructure-only entries are guarded by ADR-004's existing
AST rule; ordinary module roots never re-export them. No feature/business layer
imports a foreign adapter, and no Auth credentials or account state enter display.

Cursor/numbered browse, search, full article, comments and votes open one explicit
Repeatable Read transaction and pass its client only inside infrastructure.
News-only chronological navigation retains independent reads/current public
neighbor policy. Global isolation, Prisma core, transaction deadlines and API
schema are unchanged. This explicitly strengthens old Read Committed composed
reads, as approved; it is not a claim that old transactions already matched.

Search selection now accepts the root transaction; matching, pagination, Unicode,
cross-block projection, pins and the 64-document live-evidence batch remain intact.
The private standalone search run wrapper still supports its established scoped
snapshot/tests but is not the composed root path. No nested transaction is opened
by root search delivery. The read unit is logically read-only for persistent data;
search still creates/inserts its transaction-local temporary match table.

Existing empty pages, flags, totals, root/reply ordering, display-date fallback,
missing article behavior and nullable tombstone domain fields are retained.
Interactions retains its all-target comment-row algorithm, not a new bounded-data
claim or silent cap. Users hydrates only selected roots/replies and batches all
distinct display IDs. Required missing owner evidence throws rather than inventing
zero counts/anonymous profiles. Actor-specific outputs omit avatarMediaId as before.

## Scope of consistency

The snapshot covers these persistent content/display/interaction reads, not all
authorization throughout the platform. JWT checks, live ContentAccess evidence,
document redaction and Media metadata retain their independently approved
boundaries. A subsequent request rechecks changed visibility/revocation; no positive
grant survives across requests. Do not call this a distributed authorization ACID
snapshot or change cache/invalidation semantics based on it.

## Evidence before full gate

- Existing 79 focused audience/related/canonical-attachment/search/foundation
  E2E pass after transfer (37.293 s), zero skipped, normal exit.
- New 16 migrated AppModule E2E cover four browse variants, full/share groups,
  votes/current visibility, comments/current totals, five owner failures, missing
  evidence, empty hydration and temporary search rollback. Writers commit through
  independent pooled transactions at deterministic owner boundaries; no sleeps.
- The first new run passed 15/16; one diagnostic incorrectly expected Prisma
  query-events to include isolation setup. Corrected to actual SHOW
  transaction_isolation inside the owner read, not a relaxed isolation assertion.
  Corrected run: 16 PASS, 14.347 s, zero skipped, normal exit.
- Actual SQL: one versus ten distinct authors executes 17 SELECT statements each,
  including exactly one allowlisted Users SELECT. This is measured fixture work,
  not a universal latency/query-count promise or an assumed single Prisma JOIN.
- Controlled mutation of only the new root constant to Read Committed fails all
  seven coherence scenarios plus the actual isolation check: 8 FAIL / 8 PASS
  (15.054 s). Repeatable Read is immediately restored. No mutant is committed.
- Restored coherence/audience/viewer-redaction/performance E2E: 62 PASS, zero
  skipped, normal exit (52.41 s). Pure focused root/service/search units: 39 PASS
  before the additional root-search guard test; full frozen evidence follows.
- Ownership fixtures now inspect transaction delegates and forbidden foreign
  relation selections for all three adapters, and ensure root has no owner SQL.
  They also retain the global-client surface check: each owner adapter must have
  no direct/escaped this.prisma path around the supplied transaction.
  55 architecture fixtures PASS. These bounded fixtures are not a full table
  ownership proof; current source/query evidence accompanies them.

DEBT-056 failure/short-circuit tests now probe actual owner adapters rather than
the obsolete global Prisma delegate. Their security assertions are preserved.
The migrated fixture optionally captures SQL statements only, never parameter
values, and still drops only its generated schema with all history triggers intact.
The pinned pg 8 runtime emits its query-queue deprecation warning in the new run;
no pg 9 compatibility claim or unrelated dependency change is made.

## Remaining work and gates

Full lint/types/format, opt-in unit coverage, Prisma, production build, full E2E,
architecture/license/baseline, generated consistency and audit must be recorded
on the final source. Inherited failures remain blockers; no red merge.
Ignored evidence: `node_modules/.cache/dss-d4-news-snapshot-*`.

### Verification continuation

Full opt-in API coverage on 2026-10-14 passes **916 tests / 138 suites**, zero
skipped, normal exit (55.279 s), with all four DB/Redis opt-ins. All nine existing
thresholds remain intact; a tenth pins the new root read unit at 100% statements,
lines/functions and 80% branches. Actual root coverage is 70/70 statements,
21/21 functions and 26/30 branches (the four uncovered branches are emitted Nest
constructor metadata fallbacks, not omitted owner-failure paths).

The preceding 915-test run passed all tests but failed the unchanged search
statement threshold on its newly introduced supplied-transaction guard. A direct
negative guard test fixes that coverage gap; no threshold is lowered.
Own harness lint issues are corrected without ESLint suppressions. Final root
lint/typecheck PASS; final root/search unit recheck: 26 PASS, normal exit (1.252 s).
Prisma validation, production build (fresh API + five cached unchanged outputs),
55 architecture/license fixtures and frozen 89-finding import inventory PASS.
The inventory number does not capture the additional SQL ownership correction.
Changed-file format/diff gates PASS; canonical schema, Prisma schema, dependencies
and authored frontend are unchanged.

Global format remains red on 41 inherited files; audit reports one high / ten
moderate findings; all 14 dependency-patch regressions pass. Parent draft PR #15
remains unaccepted: storage containment succeeds on both OSes, Web/audit fail and
its main CI job is CANCELLED. This is terminal parent evidence, not current-head
acceptance or an inferred live job. No CI rerun/cancellation is issued here.

One command was not executed when the automatic approval service reported an
account usage-limit review error. On resuming the next day, prior command handles
were authoritatively absent and completed logs were checked before any repeat.
Docker Engine was stopped; the installed Docker Desktop was started, without
reinstalling it or changing WSL. Dev services become healthy. Test services and
the existing optional observability collector are started again.

The exact owned 5435 Compose project/port/tmpfs identity is revalidated; only that
synthetic DB is recreated. Zero public tables before all 54 migrations, no seed.
The 5434 test container is started without an intentional reset, but its tmpfs
schema is already empty after Docker stop. The first resumed coverage therefore
fails **81 / 916** tests (835 pass) on missing public base tables (84.602 s), not
asserted production regressions. Actual zero-table/zero-active-query evidence and
the integration fixtures' LIKE public.users setup establish the missing prerequisite.
Current migrations are then applied to this disposable 5434 base; the complete
opt-in run is repeated. Dev 5433 data is never reset or migrated in this step.

After base migration the final-source full coverage repeats successfully:
**916 PASS / 138 suites**, zero skipped, normal exit (59.523 s), all four opt-ins
and all ten thresholds. The failed empty-base run remains recorded above; it is
not recast as a pass. Test/debug source and production source are frozen before
the full API E2E starts on separately migrated clean 5435.

Full API E2E: **304 PASS / 1 FAIL**, 32/33 suites, 305 tests, zero skipped
(311.464 s). All 16 new snapshot tests and existing audience (21), viewer redaction
(20), related (12), attachments (29), search query/storage/projection/performance
(35 combined) and atomic target composition (17) pass in this full run. The entire
Auth suite (26) and leaderboard fixture pass this time; earlier intermittent
DEBT-045 failures are not declared fixed or waived by this observation.

The remaining failed test repeats DEBT-045's viewCount null-versus-zero mismatch;
its suite also retains the prohibited interactionTarget deletion cleanup error.
No implementation assertion, timeout, history trigger or scoring policy is changed
to green it. After complete failing JSON, zero active test DB queries and zero
owned API fixture schemas, only the exact owned Jest PID/command is stopped for
retained handles. This is not a successful full-suite process exit. No isolated
Auth repeat is needed when all 26 already pass in the full run.

Fresh other workspace checks PASS: Editor 23, Storage 43, Worker 36 and Web 59;
Storage/Worker/Web collect coverage. They run after the measured API E2E, not
concurrently with it. Web's bounded guest entry check alone runs in Chromium:
the landing heading renders, but Enter Station is absent from the actual DOM
(DEBT-034). Verification stops at this first broken UI boundary; no login/API
journey past it is certified, no full 13-case Web pass is claimed and no frontend
assertion or visual design is changed.

GraphQL consistency repeats DEBT-044's generated barrel comment drift, with schema
and operations unchanged. Its generator adds only eslint-disable/newline to the
existing barrel. Next dev also rewrites its generated AGENTS block. Both own
side effects are inspected and restored exactly before commit; generated barrel
blob matches the original. Canonical schema, authored frontend, Prisma schema
and dependency lockfile have no diff. Only API test coverage configuration changes
in package.json, not dependency versions or tooling rules.

Final changed-file format/diff checks PASS. This is a locally implemented bounded
ownership increment for draft review, not a green complete package, accepted D4
or a Phase 11 baseline. Independent review, current-head CI and owner acceptance
remain OPEN; inherited global format/audit/generated/Web/E2E failures are not waived.

After the full run, actual PostgreSQL SHOW confirms both default and independent
transaction isolation remain read committed. Only the approved composed operations
use Repeatable Read. The final architecture recheck retains 55 passing fixtures
and the unchanged 89-finding baseline; no existing global-client check is removed
when adding the supplied-transaction ownership checks.

This closes the mapped News delivery SQL transfer locally, not all SQL ownership.
Interactions mentions, Reputation history display, Users IAM/shared-row reads and
transaction-local subject checks still need disposition. D4.4 explicit surfaces
and ORM isolation, D4.5 enforcement/acceptance, D5–D7, stack boundary audit and owner
acceptance remain required. Stop before Phase 11 for its mandatory brainstorm.
The owner-authored untracked stack audit plan remains untouched/unstaged.
