# D4 — Independent IAM subject reads

Date: 2026-10-16. Branch: `debt/d4-iam-independent-reads`.
Parent: `b631e99` / draft PR #25; unaccepted review stack, not a release baseline.

## Ownership and preserved behavior

IAM consumes separate Boolean existence and nullable assignment input ports.
Auth publishes authoritative ID-only existence. Root binds that contract and
assembles Auth-owned anchor fragments with IAM-owned relation selection/mapping.
IAM's ordinary repository no longer queries `users` for either operation.

All ACTIVE/DEACTIVATED/BANNED/DELETED rows still exist for these checks. Missing
subject is null/false; existing subject without assignments is an empty summary.
No credentials/profile facts cross these inputs. No eligibility filter, cache,
pre-read, new transaction, snapshot, isolation/timeout or transport change.

Role/direct assignments retain `assignedAt ASC` (not alphabetical order). Role
permission keys remain unsorted; effective permissions retain application sorting.
Owned grant/revoke sequencing and final-holder protections remain unchanged.

## Pre/post SQL characterization

Before production transfer, the actual migrated AppModule ran **23/23 E2E PASS**
with normal exit (6.581 s), including four new populated all-state cases. Seven
SELECT statements were observed for populated reads: ID-only users anchor,
user_roles, user_permissions, roles, two permission lookups, role_permissions.
Parallel branch completion order varied even before the change. Tests therefore
pin counts, relation dependencies and assignment ordering, not an invented serial
SQL order. No BEGIN/COMMIT or extra existence query appears in this read.

After initial transfer, the same **23/23 PASS**, normal exit (6.749 s). Exact
query-object unit tests additionally pin the original nested select and where;
nullable/empty results, provider failures and no cross-request cache are tested.
Existing three PostgreSQL assignment/unique/FK tests moved to root composition
because they now instantiate both actual Auth and IAM/root adapters. No assertions
or constraints removed and no successful authorization stub introduced.

## Local quality evidence

- Full opt-in API coverage: **1079/1079 PASS**, 146 suites, zero skipped,
  normal exit (52.710 s); **54 configured thresholds PASS**, five new 100% targets.
- Root lint/typecheck, Prisma validation, production build PASS. Build: six tasks,
  five cached, freshly rebuilt API (23.227 s).
- Architecture/license PASS: **88/88 AST tests**, frozen import inventory **84**
  unchanged. Inventory count is not SQL ownership acceptance.
- Adjacent Editor 23, Web 59 (two workers, unchanged deadlines), Storage 43,
  Worker 36, dependency-patch 14 PASS. DEBT-058 is not closed by a passing Web repeat.
- Global format remains RED: 41 inherited files. Dependency audit remains RED:
  one high/ten moderate. Generated consistency remains RED: DEBT-044 barrel
  drift; only the generator's own local change restored exactly, no frontend edit.

Initial full coverage attempts passed every assertion but failed the new 100%
branch thresholds on compiler-generated constructor metadata. Explicit DI plus
inline narrow persistence dependencies removed those synthetic branches. A
two-file diagnostic with an empty threshold map was not a quality gate; the final
full opt-in run used all 54 checked-in thresholds unchanged. Initial final lint
also caught unformatted narrow types; formatting fixed, fresh root lint PASS.
No coverage ignore, test budget increase or protection bypass.

Full API E2E: **432 PASS / 1 FAIL**, 433 tests, 41 suites, zero skipped,
266.299 s to completed JSON. The sole failing assertion is the known DEBT-045
News `viewCount` null-versus-zero mismatch. All 23 subject-boundary and five
IAM transaction E2E pass in this full run. The previous full run's leaderboard
fixture tie does not reproduce here; its absence does not close that debt.

Jest retained open handles after emitting its complete report. After verifying
zero client connections and zero owned `api_boundary_%` schemas, only this run's
verified node/Jest PID 25896 was stopped. The terminal returned exit 1, not a
normal successful exit. Full E2E remains RED; no skipped tests, changed deadlines
or disabled history protections.

It uses recreated disposable loopback test DB 5435 only: exact Compose project,
service, port binding, tmpfs and zero active clients validated before recreation;
zero tables then all 54 migrations verified, no seed. Dev 5433 untouched.

## CI and remaining scope

Parent PR #25 CI: containment Ubuntu/Windows PASS; Web smoke 10 PASS/3 FAIL
on known DEBT-034 `Enter Station` locator; dependency audit RED. Main job still
running when checked; do not infer complete CI success.

All six subject paths now have local runtime ownership transfers; full D4
SQL/relation/raw-SQL/Worker inventory, D4.4/D4.5, D5–D7, requested stack audit,
review/CI/owner acceptance and mandatory Phase 11 brainstorm remain. No Phase 11
implementation, owner policy or frontend redesign. DEBT-057 stays separate.
Owner-authored untracked stack-audit plan remains untouched and unstaged.

Ignored evidence: `node_modules/.cache/d4-iam-reads-*`.
