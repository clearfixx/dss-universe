# D4 — Leaderboard runtime statement ownership

Date: 2026-10-18. Branch `debt/d4-leaderboard-runtime-ownership`, based on
`65d8d7b` / draft PR #29 (unaccepted). Owner approved the one-statement direction;
DEBT-060 is an approved separate subsequent correction, not included here.

## Runtime boundary

The old multi-owner PrismaLeaderboardsRepository is replaced with a
RankingFactsLeaderboardsRepository consuming a Leaderboards-owned facts input.
Root PrismaLeaderboardRankingReader performs exactly one parameterized statement
and copies only allowlisted scalar facts, normalizing numeric persistence values.
It does not export raw rows, account state, credentials or all-time points.

Auth owns subject source/ID/account age/ACTIVE predicate; Users owns only public
profile columns; Community Points owns signed period/all-time aggregate bodies;
Reputation owns signed totals through endsAt; Levels owns threshold/order/LIMIT;
Custom Titles owns selected/unrevoked/active title joins and display columns.
Leaderboards owns ROW_NUMBER ordering, page bounds, viewer inclusion and response
mapping. Root only assembles fixed operation-specific owner fragments. Technical
entries remain guarded and absent from public business roots.

No extra existence read, transaction, isolation/timeout change, cache, scoring
formula, ACTIVE policy, API/schema/migration or frontend change. Title truthiness,
null level fallback, inclusive time bounds, signed corrections, zero-point member
inclusion, deterministic ties and empty-page legacy DEBT-060 are retained.
Existing LeaderboardsService exports remain D4.4 work, not newly certified APIs.

## Evidence

Twelve new unit cases verify original SQL fingerprints, exact binding values and
order, one query/no transaction/no independent read, numeric conversion, safe fact
allowlist, failure propagation, page/viewer interpretation and title/level edges.
Nine new files have explicit 100% branch/function/line/statement thresholds; all
are fully covered. No existing threshold is weakened.

Original bounded fingerprint:
`f80d18c4d5e8aaa1394bd1932ee37bfcb8ad2d30ca6ba44450c45e7740e8f1f5`.
Original all-time fingerprint:
`1b00c7d997dc49d54f498de251ba39c61a45fb85364eb87e0dbb57002d8acc21`.
Bindings remain endsAt, optional startsAt, endsAt, endsAt, firstRank, lastRank,
viewerId. No fingerprints were rewritten to bless changed SQL. Initial unit
fingerprint failures exposed a trailing fragment space before a comma; assembly
was corrected to the original text before the successful run.

The same fourteen isolated fully migrated PostgreSQL golden cases now construct
the real root reader plus fact repository. Assertions/fingerprints are unchanged;
14/14 PASS, normal exit, 38.739s. Immutable history protections remain enabled.
Full opt-in API coverage: 1096/1096 tests, 148 suites, 103.559s, normal exit; all
68 explicit thresholds pass. Final type-only test-spy correction subsequently
passes all twelve focused cases, normal exit, 1.423s. Initial lint failures were
fixed by explicit unknown-array typing, not rule suppression.

Root lint and typecheck pass (9 tasks); Prisma validation passes; production build
passes (6 tasks, 5 cached, fresh API build; 33.221s). Architecture check passes
91 AST tests; frozen baseline remains 84 open findings, zero additions. New rules
pin no feature foreign persistence, guarded entries and fixed single-query root
assembly. This inventory remains report-only, not a full compliance certificate.

Adjacent gates: Editor 23, Storage 43, Worker 36, Web 59 and dependency-patch 14
tests PASS; no altered timeouts or selective test exclusions. Global format check
remains red on 41 inherited files, none in this package; dependency audit remains
red on 1 high and 10 moderate findings. Those separate debts are not waived.
GraphQL generation check reproduces only DEBT-044's generated web-barrel
eslint-disable/newline drift. That command's own barrel change was removed;
schema.gql and generated operation outputs have no diff. This is not a green
GraphQL check or a correction of DEBT-044. Changed files pass format/diff checks.

Parent PR #29 remains draft/open/unaccepted: both containment jobs PASS, main
quality/Web smoke/audit FAIL. Its main quality job specifically failed one
TotpService unit case (DEBT-041); this is not a new runtime-packet CI result.

Full API E2E: 455 PASS / 1 FAIL of 456 tests, 43 suites, zero skipped,
306.378s. All fourteen ownership goldens and the broad HTTP Leaderboards
foundation pass in that full run. Only the known News foundation mismatch remains:
viewCount expected null, actual 0 (DEBT-045). The shared leaderboard fixture tie
and DEBT-059 schema-write failure did not reproduce; this does not close them.
Jest retained handles after the complete JSON. Only the verified owned Jest PID
26368 was stopped after zero DB clients and zero fixture schemas; shell exit -1
(4294967295), not a normal green completion. No fixture/timer/history protections
were weakened and the initial full report is retained without replacement.

Runtime CI/review remains pending packet publication, not local acceptance.
The full API E2E database is a separately verified tmpfs disposable
container at 127.0.0.1:5435, with zero clients before recreation and all 54
migrations applied, no seed. Neither development DB 5433 nor coverage DB 5434
is recreated by this packet.

Worker source is unchanged. DEBT-061 identity/replay policy, full D4 matrix,
D4.4/D4.5, D5–D7, stack audit and mandatory Phase 11 brainstorm remain open.
User-owned STACK_AUDIT_PLAN.md is untouched. No Phase 11 implementation.
