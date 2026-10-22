# DEBT-077 — Arrival demo pause/resume smoke readiness

## Evidence

The DEBT-015 gate after the approved DEBT-076 concurrency mitigation passes API
coverage 1298/1298 and E2E 593/593 (55 suites, zero skips/todo/runtime errors).
GraphQL consistency, build and API entry checks pass. Fresh Web smoke fails
one of 13 tests, without retry: `demo activity can be paused and resumed`.
Its first expected Alex event does not appear within the existing 5000ms
assertion timeout; the snapshot still shows the initial event. The Web reporter
records `{ "status": "failed", "tests": 13 }` and the wrapper exits 1.

Raw evidence: `dss-d6-quality-full-after076.log` in temporary storage; reports
under `node_modules/.cache/quality-full-eS98bn`. Playwright context is retained
under `apps/web/test-results/arrival-demo-activity-can-be-paused-and-resumed-chromium`.

## Investigation boundary

The test uses a fixed 100ms sleep before fake-clock fast-forward. The real hook
starts its 6500ms interval only after IntersectionObserver reports visibility,
and ignores ticks while arrival is playing. A visible button/initial text does
not itself prove both prerequisites. This identifies an unproven synchronization
assumption; it does not yet establish whether the failure is solely test ordering
or a product defect. No runtime/UI changes or timeout increases were made.

## Approved separate test-only package

Characterize the actual browser readiness ordering, then make the test wait on
real observer/arrival readiness rather than a fixed sleep, preserving actual
visibility behavior, fake-clock timing, pause/resume assertions and console-error
checks. Do not replace IntersectionObserver with an always-visible mock, weaken
the expected sequence, increase timeout or introduce retry-to-green.
Any required product/UI change must be raised separately with the owner.

## Implementation and evidence

The owner approved the separate package. A test-only probe wraps the native
IntersectionObserver, forwards actual entries and preserves callback receiver,
observe/disconnect behavior. It counts completed visible delivery for the real
station element. No fabricated visibility or runtime imports are introduced.

The new characterization holds delivery of actual visible entries, advances
7000ms and proves the initial event remains; releasing the real entries starts
the actual hook timer, and the next7000ms advances to Alex. Pause/resume now
waits for ready arrival, visible document and completed native observer delivery
(a new delivery after resuming), replacing both100ms sleeps. The original
Alex/paused-Alex/Maria sequence and console-error assertions are unchanged.

Focused controls pass2/2. Full fresh smoke passes14/14 in37.7s with retries0,
workers2, forbid-only and the strict reporter (`status=passed, tests=14`).
Web typecheck/lint and formatting pass. The first helper typecheck exposed an
incorrect Window assertion type; it was corrected to the actual `typeof window`
without suppressions. An initial full-smoke CLI attempt failed before any tests
because PowerShell converted an unquoted comma; the corrected quoted command
passes. Neither failure was an application change or hidden test retry.

Logs in temporary storage: `dss-d6-077-focused-smoke.log`,
`dss-d6-077-types-final.log`, `dss-d6-077-lint-final.log`,
`dss-d6-077-all-smoke.log` (CLI failure),
`dss-d6-077-all-smoke-corrected-cli.log` (full smoke).
Reporter JSON: `node_modules/.cache/d6-077-web-smoke.json`.
The consolidated full gate and remote acceptance remain open.
