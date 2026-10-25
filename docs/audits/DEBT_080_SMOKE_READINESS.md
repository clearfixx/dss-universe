# DEBT-080 — Academy demo readiness and strict CI smoke

Status: owner-approved test/CI correction implemented; full verification and
acceptance open. Branch: `debt/debt-080-smoke-readiness`, accepted base `f118d82`.

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

## Causal diagnostic and explicit residual boundary

Failed snapshots show the TypeScript query and searching stage0: the click was
dispatched. Temporary test-only instrumentation recorded actual550ms search timer
scheduling/firing/cancellation. A higher-overhead10-repeat diagnostic passed10/10;
it was not treated as correction. A lower-overhead20-repeat diagnostic failed2/20:
sample11 scheduled1627.2ms, cancelled1648.7ms; sample12 scheduled1463.7ms,
cancelled1481.9ms. Both had zero timer fires. Cancellation stacks point to
UniverseArrival.useEffect through commitHookEffectListUnmount and
commitHookPassiveUnmountEffects in the dev React bundle.

Ignored diagnostic logs: `%TEMP%/dss-debt080-timer-probe.log` and
`%TEMP%/dss-debt080-light-timer-probe.log`. Temporary wrappers/console output were
removed. This proves the observed dev passive-cleanup cancellation, not a universal
production cause. Owner approved separate DEBT-081 research of early-interaction
production behavior. The test-only correction does not fix or erase that risk.

## Test/CI correction and controls

The Academy scenario uses the existing native IntersectionObserver probe and
waitForStationDemoReadiness before clicking. The helper forwards real visible
entries, ignores disconnected observers and waits for ready arrival, visible
document and completed native delivery. No fabricated entry, arbitrary sleep,
weakened source-preview assertion or timeout increase is introduced.

Mandatory CI smoke explicitly uses retries0/workers2/forbid-only; actual
Playwright config also defaults to retries0. Existing policy suite adds two
regressions: the CI command and actual Playwright --list JSON under CI=1 (no
server/browser launched). Both fail before correction and pass after; existing
Vitest controls remain green (4/4 total).

Ready-state control:20/20 pass without retries (1.8m), same bounded workers,
unchanged assertions and actual browser/server. Log:
`%TEMP%/dss-debt080-ready-control.log`. The interrupted permission review lost the
process handle; the retained terminal log confirms all20 passed, not a restart.

Story: Academy click → local timer → static demo answer → topic-specific source
preview. This demo has no API/database write. Production early-interaction
behavior remains DEBT-081, not declared fixed by post-readiness verification.

Full smoke, quality/build/CI and acceptance remain open. Known dependency blockers
are not waived; no runtime correction is included.

Full fresh Web smoke subsequently passes14/14 (59.4s), retries0/workers2,
forbid-only, real server/browser and retained failure traces. Log:
`%TEMP%/dss-debt080-full-smoke.log`. Exact workflow/config regressions pass4/4;
the CI command assertion also rejects appended conflicting flags and literal
continue-on-error:true. Full quality/build/CI are still separate pending gates.

Independent Web lint/typecheck and production build pass (6 tasks,5 cached;
Web rebuilt). Initial quality:full attempt stopped at db:check-drift with P1001,
because Docker engine was not running. Log `%TEMP%/dss-debt080-quality-full.log`
is preserved; no schema drift result is inferred from it. A normal Docker Desktop
start restored engine29.8.2. Only declared postgres-test/redis-test services were
explicitly started; existing54 migrations applied successfully to the empty
disposable dss_test database on5434. No reset, orphan removal, historical migration
edit or dev5433 migration was performed. Docker startup also resumes configured
existing dev containers; that is not a claim that no other service starts.

Full-gate retry log: `%TEMP%/dss-debt080-quality-after-services.log`, exit1 at
security:check. Earlier steps pass: format, architecture140/140, Prisma validation
and generation, empty drift, lint, types, runner-policy42/42 and security-policy.
Later consolidated coverage/E2E/generated-check/build/smoke stages did not run;
independent build/smoke above do not substitute for those missing stages.

Current audit has seven blocking IDs: GHSA-2464-fhr4-w9xw (critical),
GHSA-p3m5-59mp-jv5r (high), GHSA-673q-mjm6-r5xr (critical),
GHSA-mrhx-c7xc-m3w5 (Zod/high), GHSA-27r3-jxmh-p828 (body-parser/high),
GHSA-q7qp-rjg7-q26m (multer/high), GHSA-xjj6-f33q-929c (undici/high).
The existing local braces patch integrity and14 regressions pass; no exception
was added. The raw audit remains visible. Owner approved separate DEBT-016 to
address all seven, including needed safe patch/minor/transitive updates after
upstream verification. No dependency change belongs to DEBT-080.

## Security baseline integration — 2026-10-25

The preceding audit failure is historical evidence, not the current dependency
status. Owner accepted DEBT-016 and PR84 was merged into main089c52f after all
five exact-head CI checks and local quality:full passed (API593/593, fresh Web
14/14 without retries, high0/critical0). Moderate17/low2 remain visible.
This branch integrates that accepted main with a normal merge, no history rewrite
and no conflict resolution. Dependency changes remain owned by PR84, not DEBT-080.

PR83's prior headc49ec47 independently passed main quality (API1298 unit tests,
E2E593/593), Web smoke and both containment platforms; its audit was blocked by
the seven findings above. Those old results do not certify the newly integrated
head. Full local gate and fresh exact-head CI must run again; DEBT-080 acceptance
remains open. DEBT-081 production research is still a separate package.
