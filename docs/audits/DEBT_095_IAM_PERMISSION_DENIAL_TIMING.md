# DEBT-095 — Unexplained IAM permission-denial E2E timeout

Date: 2026-11-08. Observed runtime head: `35aec05`, PR144.
Status: confirmed local gate failure; cause open, no IAM correction claimed.

## Captured failure

The exact-head local `quality:full` ended exit1, E2E698/699 across65 suites,
zero skips/todo. The failed case is
`DSS API (e2e) manages IAM permissions through the owned repository and rolls back failed audit`
in `apps/api/test/app.e2e-spec.ts`. Jest reports the unchanged5000ms deadline;
the JSON records wall duration270190ms, from07:58:03.451 to08:02:33.641 UTC.
The preserved local report SHA256 is
`22307a7b409a8342a538ccb98b309c3fb7d2e931e535c9e2749fefa3aa44625c`.

Actual CI at the same head passed8/8 checks and E2E699/699. Its exact test case
passed1106ms. Downloaded Actions artifact13609304304 from run42460231831 has
verified ZIP SHA256
`473fac37bda406d6014fb8628ad3c359d9938c8027329c4297b4beec148a3c19`;
the contained JSON SHA256 is
`b3f2b6c5089b908d0d914dab3ea1bdc36e7f506e49bfa84356ba703761308b38`.
No file from that archive is executed. CI synthetic checkout `2a9c5d8` has
the exact PR tree `80b30f605ea9f5bff18432152ca2608f9865935b`.

All ten new Media regressions passed in the failed local run. Coverage5/5
workspace packages/API1469 tests passed. The local pipeline stopped at E2E;
its later GraphQL/build/compiled-entry/Web stages did not execute. CI did
complete build6/6 and Web15/15 without retries. These scopes are not exchanged.

## Timing observations and limits

Existing structured logs show an IAM GET401 response at test offset677ms
with responseTime15ms. A subsequent IAM POST403 response records
responseTime270753ms and offset271500ms. Later IAM CRUD/rollback responses
also occur after the case's recorded end. The comparison labels these as
observed IAM responses in the wall interval, not independently correlated
ownership or proof of where the delay occurred.

The first registration had therefore progressed far enough to send the GET;
moving password setup cannot be selected as the correction from this evidence.
No monotonic clock, event-loop or per-owner span was captured. Neither a
fixture defect, an authorization/Redis/SQL delay nor process suspension is
established. A new passing run alone would not identify this cause.

Verified System-log queries found zero Kernel-Power events over the entire
gate07:46:59.503–08:11:29.281 UTC. Kernel-General and Time-Service queries also
returned zero events around the failed case. No recorded power/time event
explains the gap. This is not a general proof about all execution pauses.

The IAM test and IAM/Auth/Authorization runtime files have no changes in PR144.
That source observation does not prove a cause or automatically clear the
failed gate. No test rerun, deadline increase, assertion relaxation, Auth mock
or IAM production change has been made in response to the failure.

## Read-only helper and next decision

`tools/agent-helpers/quality/inspect-iam-timeout.mjs` reads bounded existing
local/CI JSON and structured logs from workspace cache. It emits only test
timing/status and normalized IAM response facts, without headers, bodies, SQL
or credentials. It does not contact services or execute tests/archived code.
Local comparison data is retained in
`tools/agent-helpers/media-intake-iam-timeout-comparison.local.json`.

Propose a separate diagnostic/test packet before accepting PR144: measure the
real denied request, Auth/session/Authorization facts boundaries, Redis/Prisma
and wall/monotonic/event-loop timing. Preserve exact IAM allow/deny/CRUD/audit
rollback assertions and5000ms, with no sleep synchronization or retries.
Correct only a demonstrated fixture cause. A runtime cause requires its own
design/approval; an unidentified pause remains explicitly open. The preserved
red report must not be replaced by a later green result. Final integrated
head still requires the full local gate, CI and owner acceptance.

The owner subsequently approved a separate diagnostic/test packet, with runtime
causes still requiring separate design/approval. Branch
`audit/debt-095-iam-denial-timing` is based on Media PR144 head `792da8b`;
it is not merged into that runtime packet or main at this checkpoint.
This is independent of the already scoped historical DEBT-086/093 findings.

## Diagnostic candidate and first valid observation

Only the API test and its test helpers are instrumented. With
`DSS_IAM_E2E_DIAGNOSTIC=1` and an explicit unique cache JSON output path, the
fixture observes the real session validator, current-access reader, each real
PermissionsGuard instance and Redis commands. Calls still return their original
values/promises and error identities. No arguments, results, SQL text/parameters,
headers or credentials are stored. Prisma query durations, Redis connection/
queue state, process CPU, debugger-listening booleans, wall/monotonic clocks and
event-loop histogram samples are recorded. The histogram is observation, not
sleep synchronization. The afterEach hook disables it, restores spies and
captures pending spans without cancelling or awaiting the original work.

The observer is inactive by default. Its span/checkpoint bounds are explicit;
dropped span count is reported, never interpreted as complete coverage. The
prototype spy invokes the saved method with the actual guard instance; one
line-local lint annotation documents that intentional method reference. No
production code, lint configuration, policy, assertion or deadline changes.

`tools/agent-helpers/debt095/run-iam-timing.ps1` runs one focused case against
prepared disposable services. It rejects a result unless exactly that case
executed and the timing report exists. The first launcher at `5e83930` had
Windows regex double escaping: zero executed/27 skipped, no timing report.
Its JSON SHA256 is
`65c799e7236ed55ce62d9b3d3af680968f1d79829ae4642c2191de7798489192`.
That native exit0 is an invalid observation, not a passing diagnostic.
The launcher was corrected and made fail-closed at `3eb7904`.

The first valid focused observation at that source passed the original case in
1452ms; the other26 cases were deliberately excluded. This is not a full gate.
Observed wall/monotonic duration1445/1445.153ms, delta−0.153ms; event-loop maximum
64.061ms over56 samples. Session reads maximum4.969ms, current access9.157ms,
guard decision0.224ms, Redis command1.159ms; zero pending/dropped spans.
Redis was ready with zero queued commands at both snapshots;139 observed Prisma
queries total324.313ms, maximum45.964ms. Debugger-listening/inspect/auto-attach
booleans were false. Query counts and CPU are scoped observations, not exclusive
causal attribution to the denied request.

The 270-second delay did not reproduce. No fixture correction was chosen and
the original cause remains open. Focused Jest JSON SHA256 is
`250e4a0909f1a9666a60b70f79b2c369bcebcb539a2f249f83c12fd592a5686d`;
timings JSON SHA256 is
`4ba72cef568c9170efb459839bfc07f14d75023ba5e8e0b43bdcdc4d62e7a6e7`.
The original red evidence remains unchanged. Full local gate, final CI and owner
acceptance of this diagnostic-only result remain required; this does not close
DEBT-095, accept Media PR144 or complete D7.
