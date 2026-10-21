# DEBT-060 — Population totals independent of leaderboard page rows

Date: 2026-10-18. Branch `debt/d4-leaderboard-empty-page-totals`, based on
`a7afa0a` / draft PR #30 (unaccepted). Owner explicitly approved this correction
after the separate behavior-neutral ownership transfer. No Phase 11 work.

## Reproduction and correction

Before runtime changes, the real migrated DEBT-060 case fails normally: one
ACTIVE member, missing viewer, page 99/limit 1 expects total=1/totalPages=1 but
receives zero for both. The targeted red run uses one selected case (13 others
not selected), 2.625s; it is a reproduction, not a full gate or green claim.

The semantic facts port now returns `{ total, rows }`; cards no longer carry a
population total. Leaderboards still owns rank/page/viewer interpretation and
safe card mapping. Its guarded page fragment reads the existing window total
from `ranked` (LIMIT 1), coalesces only the actually empty population to zero, and
LEFT JOINs the requested ranks or viewer. This is one parameterized statement
and one statement-level view, not an independent COUNT query, transaction or
cached total. Ranking, signed windows, ACTIVE population and enrichment are
unchanged. Root normalizes/allowlists facts and removes the technical null-ID
page row; no synthetic member reaches the business port. A missing SQL population
row is an invariant error, not a fabricated zero fallback. Provider errors propagate.

No scoring/permission/status policy, timeout, database schema/migration, GraphQL
API or frontend change. Owner SQL stays behind explicit guarded entries; root
does not copy owned ranking/count algorithms into itself.

## SQL review and regressions

Unit tests reconstruct the old final selection after the actual unchanged CTE
prefix and retain both original hashes. They separately compare the exact new
population-preserving SQL tail and every binding value/order. This is an explicit
review of the authorized behavior change, not blindly replacing failed goldens.

Original bounded/all-time hashes retained by prefix proof:
`f80d18c4d5e8aaa1394bd1932ee37bfcb8ad2d30ca6ba44450c45e7740e8f1f5`,
`1b00c7d997dc49d54f498de251ba39c61a45fb85364eb87e0dbb57002d8acc21`.
New full bounded/all-time fingerprints:
`7ad932f145a60d872d8ad085004d53fb88abedef3891a445cda5b0d3540b3496`,
`0be70ec3be08c1bbadb7eaa016bd8bb5fc340b78fb771b078657fffe90e39bea`.
Bindings remain endsAt, optional startsAt, endsAt, endsAt, firstRank, lastRank,
viewerId. The untrusted viewer string is a bound value, not executable SQL text.

Thirty isolated fully migrated PostgreSQL cases PASS, normal exit, 43.322s.
They retain the prior ordering/eligibility/window/level/title/reputation/public
card evidence and add missing/deactivated/banned/deleted viewers across MONTH,
YEAR and ALL_TIME, partial last pages and beyond-end pages, all-ineligible empty
populations and new-read population changes after deactivation. Every read is
one statement. Immutable history protections remain enabled; each case owns and
cleans its generated schema. SQL fingerprints are checked on actual DB queries.

Full opt-in API coverage PASS: 1101/1101 tests, 148 suites, 66.567s, normal exit.
All 68 existing API thresholds remain unchanged and pass, including nine 100%
ranking targets. Seventeen focused unit cases cover prefix/tail/bindings,
sentinel filtering, missing population rejection, safe facts, empty/nonempty
counts, viewer/title/level handling, parameter safety and provider failure.
Root lint/typecheck PASS (9 tasks); Prisma validation PASS; production build PASS
(6 tasks, 5 cached, fresh API; 20.511s). Architecture PASS (91 AST cases), frozen
baseline unchanged at 84 open findings, zero additions. Adjacent Editor 23,
Storage 43, Worker 36, Web 59 and dependency-patch 14 tests PASS. No deadlines,
immutable history protections or baseline budgets changed.

Global format remains red on 41 inherited files; dependency audit remains red
on 1 high and 10 moderate findings. Parent PR #30 is draft/open/unaccepted:
both containment jobs PASS, Web smoke and audit FAIL, main quality still live
at the inspected revision. These are not fresh DEBT-060 CI results or waivers.
The first attempt to start root checks never executed because automatic review
timed out; its one permitted retry ran successfully. No duplicate coverage or
E2E process was restarted on the basis of a polling/review timeout.

Full API E2E: 471 PASS / 1 FAIL of 472 tests, 43 suites, zero skipped, 348.878s.
All thirty final Leaderboards cases (including the correct January YEAR bound)
and HTTP foundation PASS inside that full run. Only known DEBT-045 News
viewCount null-versus-zero fails. The shared leaderboard fixture tie and
DEBT-059 schema-write issue do not reproduce; this does not close them.
After complete JSON, Jest retains handles. Only verified owned PID 25980 was
stopped after zero DB clients and zero fixture schemas; shell exit -1
(4294967295), not a normal green completion. Initial full red report is retained;
no timeout/fixture/history protection is weakened to hide it.

GraphQL generation reproduces only DEBT-044's generated web-barrel drift. Its
own eslint-disable/newline change is restored; schema.gql and generated operation
outputs have no diff. This is not a green GraphQL gate or a DEBT-044 fix.
Changed-file format and diff checks PASS. New PR CI/review
remains required; no merge or Phase 11 acceptance requested.

The full E2E target is the verified tmpfs-only loopback 5435
container with zero clients before recreation and 54 migrations, no seed.
Neither global quality debt nor D4 inventory/surface/enforcement acceptance is
closed by this targeted fix. User-owned STACK_AUDIT_PLAN.md is untouched.
