# DEBT-083 — React demo smoke diagnostics

## Approved boundary

Investigate the no-retry React demo failure observed on PR #81. Change only
proven test synchronization, preserving the searching state, exact answer,
restart, browser-error assertions and the existing 5000 ms expectation timeout.
No application runtime or UI changes are authorized by this package. A runtime
cause must instead be recorded under DEBT-081 and separately approved.

## Baseline and retained failure

Diagnostic branch: `debt/debt-083-react-demo-diagnostics`, from accepted main
`a35326afdd4ebba484540a46f468c82d4bb586a9`. PR #85 is separate and remains
unmerged pending owner acceptance.

PR #81 head `1343d5a583234f1663e6de8eb136060288724d39`, Quality run
`40176117650`, Web job `121117051433` failed the scenario
`demo search completes locally and can start again`. The searching assertion
passed; the React answer was absent at the existing 5000 ms deadline. Thirteen
other scenarios passed. Retries were zero. This is not a passing package.

Retained raw job log: `TEMP/dss-debt057-ci-1343d5a-web-failure.log`.
SHA256: `9145517B06173E5A92C4B341C5DE1F807F14769B60F56FAE3ACA79C9699F16F6`.

The test and `universe-arrival.tsx` are unchanged between the failing PR and
accepted main. The tombstone changes therefore did not introduce a source diff
in these files; this observation alone does not establish the failure cause.

## Source observations, not a diagnosis

The click starts four chained 550 ms timers. The mount effect cleanup can clear
the current search timer. The failing scenario does not install or await the
existing native-observer readiness helper. Neither fact proves that cleanup
occurred during the failed CI run. In particular, do not copy the Academy
readiness change merely because its symptom looks similar.

The story is entirely local: React example click → local timer progression →
prepared answer → reset to an empty input and disabled search button. No API or
database operation is required by this story.

## First local observation

One unchanged scenario was executed on a fresh development server with
`CI=1`, one worker, zero retries, `--forbid-only` and `--trace=on`.
Result: **1/1 passed**, total command report 15.1 seconds. This does not
reproduce or resolve the retained CI failure. Tracing itself may affect timing.

Log: `TEMP/dss-debt083-original-selected.log`.
Trace directory: `node_modules/.cache/debt083-original-trace/`.
An earlier anchored grep selected zero tests; its terminal exit 1 is a command
selection error, not an application failure or an executed regression.
Log: `TEMP/dss-debt083-original.log`.

Next dev regenerated the existing Web AGENTS heading from H1 to H2. This
generated instruction-file change is not an application or test correction.
The fresh server stopped after the test; no listener on port 3100 remained.

## Instrumented observation

One further observation used the same React flow and expectations with wrappers
around real 550 ms timers and the real native IntersectionObserver. No fabricated
visibility, fake clock, sleep, retry or application modification was introduced.
It passed with HTTP 200, no page errors and no fetch/XHR requests observed.

The observer disconnected at approximately 4157 ms. Search scheduled its first
timer at 4179.4 ms; native visible delivery followed at 4327.2 ms. All four timers
fired, the last at 6415.7 ms: about 2236.3 ms after initial scheduling. No tracked
timer cancellation occurred. Search therefore began before native delivery and
still completed in this observation. Missing observer readiness alone is not a
proven explanation for the CI failure.

Report: `node_modules/.cache/debt083-timer-probe.json`.
SHA256: `75F6C00CB308F10FCAB5F08B484CF0286CEE4072C9E89E927BFC977981450D0F`.
Ignored harness and screenshot share the `debt083-timer-probe` basename.
Unchanged-scenario log SHA256:
`09F118B6A4C2EE242DC49C8996E62E18699F642EBF395BE5B93072438ECD6D1A`.
The owned diagnostic server was stopped after this observation. Instrumentation
can perturb timing; this evidence neither proves a fix nor excludes a race.

## First-failure evidence correction

The accepted configuration used `trace: on-first-retry` together with zero
retries. The mandatory Web job also uploaded no Playwright results. Thus the
first failure could not leave a CI trace artifact for diagnosis.

This package now uses `retain-on-failure` and `screenshot: only-on-failure` and
uploads `apps/web/test-results` with `if: always()` and three-day retention.
Only the existing guest smoke suite runs; no secrets or authenticated test
sessions are added. Trace recording itself may affect timing. This corrects
evidence collection, not the React timing defect. Retries, worker count, smoke
command, assertions, application files and timeouts remain unchanged.

The added actual-config/workflow regression failed before correction (4/5
policy tests passed) and all five pass afterwards. An isolated synthetic test
then intentionally failed exactly once, with retries zero and no application
server. Its results contained `trace.zip` (9903 bytes), a screenshot (6196 bytes)
and error context. This is successful verification of failure recording, not
an application failure or a passing full smoke suite. Harness/results:
`node_modules/.cache/debt083-evidence-fixture/`; retained log:
`TEMP/dss-debt083-evidence-fixture.log`.

## Terminal local gate: failure retained

The independent launcher completed on exact head `77ea28d2bf834296c85d86f810bf6b07fc9b7b57`
with **exit 1**. API coverage passed 1298/1298, strict E2E passed 593/593,
GraphQL/build/production entry passed; final Web smoke failed the original
React scenario with 13/14 passing and zero retries. Its unchanged 5000 ms answer
expectation expired. The error context shows searching at step zero, still
`Opening module connections…`. No synchronization fix is implemented.

Terminal status: `node_modules/.cache/debt083-quality-durable-result.json`.
Log: `TEMP/dss-debt083-quality-durable.log`.
E2E: `node_modules/.cache/quality-full-9VPE9Y/api-e2e.json`, independently passed
the actual strict report policy with full-profile context.
Preserved failure: `node_modules/.cache/debt083-failure-77ea28d/`.
Trace SHA256: `404A3AEE0EFD6127A53B4625E82C6F924FCBBD88454B49D91B3ACBE19DD67A93`.
The screenshot was visually inspected. Trace confirms the click and searching
assertion succeeded, then no answer appeared; it records no timer-clear stack.
Do not treat green CI at this head as overriding this local red gate.

## Further bounded diagnostics

An isolated copy of the 14 smoke scenarios changed imports only, adding a
timer-observer fixture to the React case. One actual run passed 14/14 with two
workers, zero retries, no readiness wait or assertion/timeout changes. Its
in-memory attachment was not persisted by the passing GitHub reporter; there is
therefore no retained timer timeline for that observation. Do not infer absence
of cancellation from missing evidence. Log:
`TEMP/dss-debt083-full-probe-selected.log`. The initial harness under
`node_modules` selected no tests because Node rejected TypeScript stripping
there; that setup failure is separate from the actual run. No rerun-to-green
or application fix is claimed by this diagnostic result.

One additional, explicitly **controlled** experiment injected a programmatic
React-example click during `UniverseArrival.useEffect` setup. It observed a
timer scheduled at 2712.5 ms, cleared at 2714.7 ms, with no firing or replacement;
the answer stayed absent at 5000 ms. The clear stack identifies
`UniverseArrival.useEffect` and React passive-effect disconnection. This proves
the cleanup mechanism under the injected development schedule, not that the
original natural CI failure followed the same schedule. No application source
was changed. The runtime finding is tracked under DEBT-081; runtime correction
requires separate approval, not a silent test-readiness workaround.

Controlled report: `node_modules/.cache/debt083-controlled-mount.json`.
SHA256: `714D09CE3A727C6C217EB2B2CBB5BE91EA8A1A77F054A367231917C07CA8CA28`.
Harness/screenshot share this basename. The owned dev server was stopped.

## Next evidence required

Capture timer scheduling, firing and cancellation together with readiness and
the cancellation stack in a bounded diagnostic observation. Preserve failures
and distinguish instrumentation from ordinary browser behavior. Do not rerun
CI to obtain a green result, increase timeouts, add sleeps, or claim a fix from
these passing observations. The local gate is now terminal red as recorded
above. No synchronization correction, successful full local gate or acceptance
is claimed. Runtime policy/design must be agreed separately under DEBT-081;
do not suppress the legitimate early-interaction case by merely delaying this
test. DEBT-083 and acceptance of PR #81 remain open.
