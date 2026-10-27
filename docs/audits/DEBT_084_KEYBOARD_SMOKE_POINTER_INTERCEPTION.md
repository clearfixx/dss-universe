# DEBT-084 — Keyboard smoke cancellation intercepted by hero

Date: 2026-10-26. Status: OPEN; owner approved separate diagnostic/test scope.
Observed during local PR94 exact head `17ebd01` quality:full.

## Evidence availability errata — 2026-10-27

The original local error-context and four DEBT-084/085 trace ZIPs are no longer
present in D6 `apps/web/test-results`; only the latest `.last-run.json` remains.
No matching trace hashes were found in the checked D5/D6 cache archives.
These ignored artifacts cannot be restored from Git. No recovered originals
or replacement traces are claimed by this errata.

Installed Playwright1.64.0 `createRemoveOutputDirsTask` removes project output
directories at the next ordinary run. Placing diagnostic subdirectories under
the default `test-results` therefore did not preserve them across later smoke
runs. The exact deleting invocation was not independently recorded. This is
an evidence-retention mistake, not a newly demonstrated DSS runtime defect.

The dated observations and recorded hashes below remain historical records,
not currently available raw artifacts. The failed Web summary and strict API
JSON remain available separately, but neither replaces the missing traces or
the original page snapshot. Current re-verifiability is reduced accordingly.

Future evidence must be copied or written to a unique directory outside the
Playwright output root, such as `node_modules/.cache`, before another run.
Keep future re-productions distinct from missing October26 originals; do not
claim a new trace is the original evidence or silently waive PR94's failure.

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
- Error context was initially captured in D6 apps/web/test-results under the
  arrival-keyboard-interacti-4ce4b-ce-and-search-returns-focus-chromium directory;
  it is now unavailable as described in the evidence errata above.
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

## Source-inspection hypothesis — not a reproduced root cause

UniverseArrival renders its root with data-arrival ready before its passive
effect. That effect reads visit storage and, for a first non-reduced-motion
visit, writes playing before registering focusin. CSS assigns the console an
assemble animation while playing. The failing test focuses the brand link,
asserts ready once, starts search and immediately clicks Cancel search.

An initial SSR-ready observation is therefore not by itself proof that the
arrival effect and focus listener are installed. A controlled experiment must
record the order of focus, storage read, playing/ready mutations, search start
and elementFromPoint at the cancel button. It must distinguish that hypothesis
from layout/stacking or ordinary animation geometry. No claim that changing the
test readiness alone fixes this has been made; no click was forced and no
runtime/UI/CSS was changed.

## First instrumented experiment

One diagnostic run of the same keyboard flow passed1/1 with retries0, trace on,
one worker and a separate debt084-first-probe output directory. Original failure
artifacts were retained. This is not a correction, original-gate pass or claim
that the failure disappeared: instrumentation adds observation work and can
change timing. Targeted ESLint passed for the test and probe.

Trace SHA256: `4ABEDBAE4F9FFA54FCD23CD63E8742618BF64A8E9ED10ACC39A1B16B8C1822D2`.
Actual probe events: brand focus at934.6ms observes ready; first arrival storage
read at1403.7ms still observes ready; playing mutation at1417.7ms; second brand
focus at1449.6ms observes playing; ready mutation at1454.4ms. Search-button focus
at1860.9ms then observes ready. Cancel at2217.5ms returns focus to input.

Thus an early ready/focus observation can precede effect setup in the real
browser. The later second focus successfully reveals this attempt. At the
pre-cancel snapshot the console has animation/clip-path/transform none; center
hit-target is null (the probe does not scroll), so this does not reproduce hero
interception. Next evidence must causally distinguish lifecycle readiness and
viewport/animation hit-testing, rather than accepting this diagnostic pass as fix.

## Controlled early-focus experiment

One distinct experiment focuses the real React-question button at the first
arrival-storage-read boundary, before the runtime listener is installed. It does
not change the storage return value, CSS, clock or visibility. A real keyboard
Enter starts the search without another focus event; the test scrolls the real
Cancel button into view and observes browser hit-testing without forcing a click.

The diagnostic passes1/1 because it characterizes the failure: arrival playing,
Cancel present, receivesPointer false, elementFromPoint target Welcome to DSS
Universe, console clip-path inset(0px 50%), assemble animation and translateY8px.
Trace SHA256: `AF29F5E65E6B1145D8F8EAA71D3511B664298B26DDBD6E7F4A797A843225AE05`.
All three diagnostic/test files pass targeted ESLint. This is controlled dev
runtime evidence, not proof of the original smoke's precise event order, a
production reproduction or a fix. Verification stops at the broken hit-test.

Owner approved a separate DEBT-085 runtime package, starting with production
verification and lifecycle design. DEBT-084 itself remains diagnostic/test-only;
no readiness-only test fix or weakened interaction assertion is justified yet.

## New evidence after retention errata

On2026-10-27, the separate runtime package performed a new controlled production
comparison at immutable pre-fix `c5966e4` and corrected `c83150c`. The first
reproduced hero interception and stopped at the broken hit-test; the second
verified pointer receipt, a real cancellation click and restored input focus.
Both new ZIPs and JSON reports are stored outside `test-results`, with hashes
and provenance in the [new comparison record](DEBT_085_EARLY_KEYBOARD_ARRIVAL_LIFECYCLE.md#new-controlled-production-comparison--2026-10-27).
They are not recovered October26 originals, a reconstruction of the missing
natural failure page snapshot, or a waiver of PR94's failed gate.
