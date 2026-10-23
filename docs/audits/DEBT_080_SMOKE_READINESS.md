# DEBT-080 — Academy demo readiness and strict CI smoke

Status: owner-approved separate package; reproduction confirmed; correction not
implemented. Branch: `debt/debt-080-smoke-readiness`, accepted base `f118d82`.

## Confirmed finding and scope

PR81 initial CI run39968841410/job120465792097 is green but reports one flaky
and13 passed. The Academy demo test fails its existing5000ms visibility assertion
for Begin with inference and succeeds on retry. Playwright enables two retries
under CI; the mandatory Web job invokes plain test:e2e. The strict local full
quality runner's no-retry policy does not apply to that separate CI command.

Owner approved reproduction, a test-only synchronization correction if proved,
and mandatory CI smoke without retries. Preserve real browser behavior, existing
assertion strength/timeouts, UI/runtime and all source-preview checks. Do not
infer a hydration, observer or production defect merely from a failed locator.

## Baseline evidence

Unchanged accepted main f118d82, fresh server on3100 (no foreign server reuse),
CI environment, real Chromium, two workers, ten repeats and retries0:

```text
pnpm --filter @dss/web test:e2e arrival.spec.ts
  --grep 'Core module opens a demo and source previews remain topic-specific'
  --repeat-each=10 --workers=2 --retries=0 --forbid-only
  --reporter=list --trace=retain-on-failure
  --output=../../node_modules/.cache/debt080-accepted-baseline-traces
```

Result: exit1, two failed/eight passed (1.2m). Both failures are the same
arrival.spec.ts112 Begin with inference visibility assertion. Retained ignored
log: `%TEMP%/dss-debt080-accepted-baseline.log`; traces/error contexts under the
explicit output directory above. No source, timeout or assertion changed.

An earlier probe inadvertently used stale local main fcab53c (three failed/seven
passed); branch SHA review caught this before implementation. The clean new
package branch was fast-forwarded to origin/main f118d82, then the accepted-base
probe above was performed. Earlier evidence is historical only, not substituted
for accepted-base evidence. Its original traces/log remain preserved separately.

## Next required evidence

Inspect failed and successful trace ordering, including hydration, action
dispatch and search timers. Establish a deterministic readiness condition from
real behavior before changing the test. Compare bounded repetitions before/after
without retries, then full smoke/quality and CI. The known dependency audit
blocker is not waived. One clean later CI run does not close the earlier race.

No PR, runtime correction, no-retry CI change or package acceptance is claimed
at this reproduction checkpoint.
