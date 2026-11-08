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

The owner authorized documenting out-of-phase findings; diagnostic execution
and corrective test/runtime changes are not silently folded into DEBT-094.
This is independent of the already scoped historical DEBT-086/093 findings.
