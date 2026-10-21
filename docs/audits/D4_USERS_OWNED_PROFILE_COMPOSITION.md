# D4 — Owned Users profile composition

Date: 2026-10-15. Status: local runtime verified; full quality/CI/acceptance open.
Branch `debt/d4-users-owned-profile-composition`, based on `f47d214` / draft PR #21.
The parent stack is unaccepted, not a release baseline. No red PR is merged.

## Authority and full mapped scope

The owner explicitly approved the
[owner-fragment/root assembly design](../development/D4_USERS_SHARED_ROW_BOUNDARY_PLAN.md)
on 2026-10-15. The [foundation](D4_USERS_SHARED_ROW_CHARACTERIZATION.md) records
the pre-transfer behavior; this increment implements the complete mapped
lookup/public/directory/update/viewer and IAM role paths, not role display alone.

Users owns thirteen profile/identity/technical metadata selections and profile
search/sort/ID/username/update fragments. Auth owns exactly email/status/
emailVerifiedAt presentation selections, email lookup and state predicates.
IAM owns the case-insensitive directory role predicate and an independently
published role-name display reader. No owner imports another feature's service,
repository, domain or infrastructure to implement these responsibilities.

Root infrastructure assembles the physical shared-row query from guarded named
fragments behind a Users-owned semantic persistence port. This approved
shared-row-specific assembly is not generic fragment/query infrastructure.
Independent lookups stay single-query; directory rows/count stay the same lazy
Prisma batch transaction. No role/status prefetch, extra Auth/profile read,
post-update hydration, timeout/acquisition override, isolation change or cache.
Predicate/column rendering is not claimed byte-identical; observed schedule,
native semantics, safe outputs and transaction defaults are preserved.

ViewerProfileReader uses the same safe semantic lookup and explicit mapper.
Users' internal record is now only the sixteen supported display fields, without
credentials, authVersion, deactivation/abuse internals or media IDs. Update data
copies ten profile fields explicitly, ignoring forbidden extras even in malformed
runtime objects. DTO files remain contracts only. Role transport copies readonly
name arrays into its own mutable output without granting authority.

Unused Users raw-record readers, credential/verification/status setters and
generic update/email-count/username-count/hard-delete repository operations are
removed after source/test call-site review. Working Auth credential/account
operations are unchanged. This does not implement owner hard-delete/Command Deck
policy or remove any public endpoint.

No frontend, canonical schema, migration, dependency, access/scoring formula,
permissions, owner feature or Phase 11 implementation is included.

## Runtime evidence

All **20 pre-transfer characterizations** pass after transfer, including five
directory sort modes, every account state, ordinary versus ACTIVE-only lookup,
combined search/role/ID/status filters, count/page/empty metadata, role order/case,
fresh display data and unchanged credentials after profile updates. Differential
directory comparison still uses the exact parent algorithm on the same fixture.
Installed engine start defaults remain maxWait 2000 ms, timeout 5000 ms and no
isolation override. Private engine observation is test-only.

The final focused suite passes **26 migrated E2E**, zero skipped, normal exit
(7.985 s). Six new
probes verify raw (not merely mapped) safe record keys and SQL selection, forbidden
runtime updates with unchanged persisted Auth/role/media-ID evidence, failures
after actual profile/IAM SELECTs and fresh-call recovery, next-query role
revocation, and changed account state. Synthetic repository subjects do not
certify authentication. No successful authorization decision is mocked.

The focused unit run passes **42 tests / 5 suites**, zero skipped, normal exit
(2.861 s), before type-only lint refinements and the narrow IAM module metadata
expectation update. The final full coverage run below checks those final tests.
Owned fragments have exact disjoint selection/update tests; root tests pin
single-query delegation, row/count order, one batch argument/no options and
no post-update read. Role tests pin exact selection/order, requested-ID filtering,
copied arrays and propagated storage/provider failures. Existing viewer/mapper
tests still reject overbroad future runtime secret fields.

No new profile multi-provider rollback or Repeatable Read guarantee is claimed.
Profile UPDATE remains one operation, as before; role display remains independent
of the directory batch. Do not misdescribe display state as authentication.

## Architecture evidence

Five reviewed non-infrastructure Prisma imports are removed from Users DTO,
service, list options, update data and internal record. The baseline is edited
only for those exact five removals: **89 → 84**, zero added findings, no waiver or
auto-regeneration. New technical entries are guarded; normal public roots expose
only named semantic tokens/types, never fragments or concrete readers.

All **75 architecture fixtures PASS**, including exact frozen owner selections,
root owner-fragment assembly, private semantic contracts, repository/viewer lack
of direct SQL, IAM-owned role SQL and named technical/public export allowlists.
The first added IAM fixture incorrectly assumed a transaction-supplied reader;
it was corrected to the actual independent IAM-owned query, without changing
production lifetime to satisfy the test.

Remaining Prisma representation findings, transaction-local subject checks and
other foreign SQL are not waived by these five removals. Complete D4 SQL/Worker
review and D4.4/D4.5 acceptance remain necessary.

## Full quality gates

Final API opt-in unit/integration coverage: **1014 PASS / 143 suites**, zero
skipped, normal exit (52.569 s), with all four Auth/recovery/IAM DB and Auth Redis
opt-ins. All **34 thresholds PASS**, preserving the previous 26 without reduction.
The eight newly gated files have 100% statements/functions/lines; root persistence
has 80% branches and IAM display reader 75% (uncovered branches are constructor
dependency metadata only). The other six have 100% branches.

Root lint/typecheck, Prisma validation, production build and architecture/license/
baseline PASS. Build executes fresh API and reuses five unchanged cached outputs
(19.353 s). The initial full run completed
1013 PASS / 1 FAIL: IAM module metadata still expected only its previous two
public tokens. Its expectation now includes only the approved display contract;
no concrete service/repository is exported. Test-only lint typing/binding issues
were fixed without disables. The final full run above supersedes that test failure,
not the unrelated inherited quality failures below.

Fresh adjacent tests PASS: Editor 23 / Storage 43 / Worker 36 / Web 59; all 14
patch regressions PASS. Existing coverage gates pass where configured. Global
format remains red on 41 inherited files; audit remains 1 high / 10 moderate;
GraphQL consistency remains red on DEBT-044 barrel drift. Its generated side
effect is restored exactly. No new browser/dev-server success is claimed.

Final full API E2E: **398 PASS / 1 FAIL**, 399 tests / 38 suites, zero skipped
(252.124 s). All 26 Users boundary cases, all 26 Auth cases and the 23 write/16
read Reputation ownership cases pass. The single failure is known DEBT-045 News
foundation viewCount null/zero expectation plus protected target cleanup.
DEBT-048 does not reproduce; this does not close that separate debt.

The run followed CPU-heavy gates on the independently revalidated own disposable
tmpfs DB on loopback 5435, recreated from zero public tables with all 54 migrations
and no seed. Dev 5433 and unit/integration base 5434 were not reset. Complete JSON
was emitted, but retained handles prevented normal exit. Only verified completed
own Jest PID 23668 was stopped after zero active DB connections and zero owned
test schemas. This is not a successful process exit or full green gate. No
timeouts were raised, tests skipped or database protections disabled.

Ignored local evidence: `node_modules/.cache/dss-d4-users-owned-*` and current
API coverage files. These do not replace durable CI/review/owner acceptance.
The owner-authored untracked stack audit plan is untouched/unstaged.

## Remaining readiness

Transaction-local subject checks in Achievements/Custom Titles/IAM, full
delegate/relation/raw-SQL/Worker inventory, D4.4/D4.5, D5–D7, requested stack audit
and owner acceptance remain open. DEBT-057 stays separate and unimplemented.
Stop before Phase 11 for its mandatory brainstorm after preparation and stack
audit acceptance. This increment does not certify full D4 or release readiness.
