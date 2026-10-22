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

## Proposed separate package — approval pending

Characterize the actual browser readiness ordering, then make the test wait on
real observer/arrival readiness rather than a fixed sleep, preserving actual
visibility behavior, fake-clock timing, pause/resume assertions and console-error
checks. Do not replace IntersectionObserver with an always-visible mock, weaken
the expected sequence, increase timeout or introduce retry-to-green.
Any required product/UI change must be raised separately with the owner.
