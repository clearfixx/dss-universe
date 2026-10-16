# D4 — Leaderboard ownership characterization foundation

Date: 2026-10-16. Branch: `debt/d4-leaderboard-characterization`.
Parent `bb57015` / draft PR #27, unaccepted review stack.
Status: behavior foundation; **production ownership not transferred**.

## Evidence and boundaries

`apps/api/test/leaderboard-ownership.e2e-spec.ts` uses the production repository
against a fresh fully migrated private schema per case. Fourteen cases pass with
normal exit (22.792 s before adding shape assertions; observed SQL forms repeated
14/14 in 20.786 s). Full run below exercises the final shape assertions as well.
Only generated owned schemas are dropped. No ledger mutation/truncate or disabled
immutability trigger, authorization success stub or deadline increase.

Every read issues exactly one parameterized WITH statement. Tests cover empty
population; point/age/ID ties; zero above negative; ACTIVE/DEACTIVATED/BANNED/DELETED;
inclusive start/end and signed sums; all-time levels; off-page viewer; beyond-end
page; missing viewer; selected-title active/revoked/disabled; signed reputation
through endsAt; live title disable and account deactivation; public card allowlist.

Pre-transfer whitespace-only SQL fingerprints:

- bounded: `f80d18c4d5e8aaa1394bd1932ee37bfcb8ad2d30ca6ba44450c45e7740e8f1f5`;
- all-time: `1b00c7d997dc49d54f498de251ba39c61a45fb85364eb87e0dbb57002d8acc21`.

These are captured statement-shape evidence, not a substitute for scalar/binding
assertions or PostgreSQL behavior. Do not auto-refresh them while transferring
owner fragments. Current public/private profile and permission policies are not
redesigned. No HTTP reproduction of missing-viewer behavior is claimed.

DEBT-060 is separately recorded: without a viewer row, an out-of-range page returns
zero total despite an active population. The golden case explicitly characterizes
this legacy behavior; it is not the desired final count or a hidden correction.
Owner was asked about separate correction after ownership. The runtime one-SQL
design is in [the operation plan](../development/D4_LEADERBOARD_OWNERSHIP_PLAN.md).

## Local gates

- Full opt-in API coverage **1084/1084 PASS**, 147 suites, zero skipped,
  normal exit (52.163 s), all **59 thresholds PASS**. No new production coverage
  target is invented for this test/document-only foundation.
- Root lint/typecheck, Prisma validation, build PASS. Six build tasks/five cached,
  fresh API build (19.521 s). Auth/IAM/Leaderboard production sources unchanged.
- Architecture/license and baseline PASS: 89 AST tests, 84 frozen findings,
  neither reduced nor waived by these database characterizations.
- Adjacent Editor 23 / Web 59 (two workers, unchanged deadlines) / Storage 43 /
  Worker 36 / dependency patches 14 PASS.
- Changed format PASS; global format RED (41 inherited files), audit RED (one
  high/ten moderate), generated consistency RED (DEBT-044 barrel drift). Restored
  only that generator-produced local change; no authored frontend/schema edit.

Full API E2E: **454 PASS / 2 FAIL**, 456 tests, 43 suites, zero skipped,
307.360 s to completed JSON. All fourteen final shape/golden cases PASS.
Failures are the known DEBT-045 News viewCount null/zero and global Leaderboards
fixture tie. Read-only DB inspection confirms the winning synthetic points-user
was created at 03:53:30.101 UTC, expected leader-oldest at 03:54:37.028 UTC:
66.927 seconds earlier, each with 10 month points; all-time totals 10/60 explain
the differing level. No production query, scoring, ordering or fixture correction.
DEBT-059 does not reproduce here; that does not close the intermittent failure.

Jest retained handles after its complete report. Zero client connections and zero
owned `api_boundary_%` schemas verified, then only this run's exact verified
node/Jest PID 23832 stopped. Terminal returned exit 1, not normal success. No
forceExit, skipped tests, raised budgets or disabled history protections.

The run used recreated disposable loopback DB 5435. Exact Compose
project/service/port/tmpfs and zero clients validated before recreation; empty
public schema then 54 migrations verified. No seed/dev DB reset. Passing foundation
is not a passing full gate. Parent PR #27 containment Windows/Linux PASS;
Web smoke/audit RED, main job still running at inspection; no CI acceptance claim.

## Remaining scope

No runtime fragments or service/public-surface changes in this package. Finish
the SQL/Worker operation matrix, agreed owner-fragment transfer with unchanged
golden behavior, separate approved functional corrections, D4.4/D4.5, D5–D7,
stack audit and CI/review/owner acceptance. Stop before Phase 11 for its mandatory
brainstorm. DEBT-059/060 and other red gates are not waived by passing tests.
Owner stack-audit plan is untouched/untracked. Local ignored evidence:
`node_modules/.cache/d4-leaderboard-*`.
