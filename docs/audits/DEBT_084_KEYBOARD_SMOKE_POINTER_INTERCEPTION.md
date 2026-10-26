# DEBT-084 — Keyboard smoke cancellation intercepted by hero

Date: 2026-10-26. Status: OPEN; separate diagnostic/test scope requested.
Observed during local PR94 exact head `17ebd01` quality:full.

## User story and first broken boundary

A visitor reveals the arrival interface using keyboard focus, starts the React
demo search, cancels it and expects focus to return to the question input.
The first observed break is browser hit-testing on Cancel search. No backend
or database request failure is established by this observation.

The real Playwright call log resolves the enabled/visible/stable Cancel search
button, then repeatedly reports that the Welcome to DSS Universe hero section
intercepts pointer events. The button later detaches, and the test exceeds its
existing 30000ms deadline. Final page snapshot contains RESPONSE READY and Explore
another question. This shows the failed interaction and later state, not the
root cause, duration of interception, or a production reproduction.

## Evidence and limits

- Test: apps/web/e2e/arrival.spec.ts, keyboard interaction test, cancellation click.
- Error context retained in D6 apps/web/test-results under the corresponding
  arrival-keyboard-interacti-4ce4b-ce-and-search-returns-focus-chromium directory.
- Local full gate exec session53823 terminated exit1: Web13/14 without retries.
  Web report node_modules/.cache/quality-full-LEE8A3/web-smoke.json is failed/tests14.
- The same run's strict API report passes623/623 across58 suites, pending0;
  SHA256 CC6F400E67A494F100F09AEB1538210F5641F8E4567CA671E57891AB2F371862.
- Build6/6 and post-build2/2 passed. CI on that head is green, including the Web
  job; that does not invalidate this local failure or prove the test is flaky.
- The approved Auth runtime delta changes no Web source. Causation by Auth is
  not established. This is distinct from the earlier D5 Turbopack startup panic:
  this server started and13 browser tests passed.

## Separate investigation boundary

Preserve current failure artifacts. Determine runtime pointer interception
versus test readiness using controlled evidence, not rerun-to-green. Do not use
force-click, disable hit-testing, add sleeps/retries, increase deadlines or weaken
focus assertions. Runtime/UI correction requires separate approval if indicated.
The verification skill stops at this confirmed broken boundary; no claim that
the rest of the user story is verified. No implementation is included here.
