# DEBT-081 — Demo search timer lifecycle

2026-10-25. Owner approved a separate runtime package, including design,
production verification and deterministic regressions. Branch:
`debt/debt-081-demo-search-lifecycle`, from accepted main `a35326a`.
Status: isolated correction and targeted regressions implemented; corrected
production/full quality/CI/owner acceptance remain open.

## Story and evidence boundary

A guest can choose an existing demo question immediately after hydration,
see four local search steps, receive the matching prewritten answer, cancel,
restart or explore another question. This is a client-only illustrative demo,
not DSS Intelligence, an API request, database query or real search result.
No backend/provider/credential changes are needed.

The current component starts a recursive timeout chain in the click handler.
Its unrelated arrival-animation passive-effect cleanup clears that timeout.
A previously retained controlled development schedule proves that cleanup can
cancel the pending search while state remains searching. Ordinary production
Academy observations passed twice; this does not prove production immunity or
attribute every natural CI failure to that exact schedule. PR81/PR89 and the
local PR87 attempt have independent no-retry React-answer failures. Keep those
failures; do not rerun them to obtain green status.

## Ownership and state design

Keep arrival animation and station activity unchanged. Search progression owns
its own React lifecycle, independent of arrival setup/cleanup and readiness.
Use a small local search-sequence hook with reducer-owned stage, step and request
generation. It does not own answer text, matching, source previews or UI markup.

- Start creates a new generation at searching/step0, even for the same question.
- Only an effect belonging to the committed active search schedules a 550ms step.
- Effect cleanup cancels only its own timer. Effect replay reconnects the active
  search instead of leaving state searching without a scheduled continuation.
- Every timer action carries its generation and expected step. A stale action
  cannot advance a replacement, cancelled/reset search or already consumed step.
- Four accepted advances produce step4/answer. Existing answer selection,
  strings, source chips, cancellation focus and restart behavior remain.
- Cancel/reset invalidate the generation and leave idle. Unmount cancels the
  pending timer; no timer remains owned by arrival or an event-handler chain.

No readiness gate, disabled early click, added sleep, timeout increase, retries,
network fetch, real AI capability, CSS or visual redesign is part of this work.
Do not fold pending066/057/082 changes into the branch.

## Verification order

1. Verify the unchanged accepted-main production build and supported React demo
   flow in an isolated owned server/browser context. Preserve build identity,
   server output, HTTP result, page errors and browser observation. Production
   passing is not a claim that the development defect is absent.
2. Add a deterministic early-start/effect-replay regression against the current
   component before correcting it. Use real React lifecycle, not a mocked
   successful search. Pin normal four-step timing, same-question replacement,
   cancel/reset, stale actions and unmount cleanup with fake timers.
3. Implement the isolated timer ownership and run the same regressions. Preserve
   existing no-retry Web smoke assertions, real observer and5000ms budget.
4. Verify the corrected production flow, cancellation and restart with browser
   evidence. Check server/page errors; do not continue past a broken boundary.
5. Run the complete quality gate, build and CI on the committed candidate.
   Inspect actual results and retain failures. Full coverage completeness082
   remains separately pending until its accepted merge, not silently repaired.

All authored source/tests receive File Passport. Acceptance, merge and D7/stack
audit/Phase11 transitions remain separate owner decisions.

## Baseline and red/green evidence

Frozen offline install used the accepted lockfile, without dependency updates.
The unchanged production Web build succeeds with Next16.4.1, build ID
`0ytkKkVuGZrJUIWxeGMPx`. One fresh guest browser observation at source `a35326a`
passes early React click, exact answer, cancel, restart and exact answer again.
HTTP200, pageErrors0, consoleErrors0. Fetch/XHR observations contain only Link
prefetch paths `/login` and `/register`, not a search API or AI provider.
Screenshot was visually inspected. Owned loopback server3102 was stopped after
the observation. Report `node_modules/.cache/debt081-production-baseline.json`,
SHA256 `9C83FC8B9BE741E3D5675D4568338935CE1EF9AA747CCF3C01D35611C264CD88`.
This passing baseline does not erase the controlled development failure.

The new actual-component regression injects a click during the first root
IntersectionObserver observation, before arrival effect replay. Only browser
APIs/time and the unrelated visual sphere are replaced, not search/matching/UI.
Awaited React act removes the initial harness warning without changing the
failure: early case fails at step1, normal/cancel/restart control passes.
Before report SHA256 `C4F23E4524236FF4454765040306A3FD8D8EE1E221104AF383508FDC2A1EBDB1`.
After the isolated ownership correction, the same two cases pass2/2; after
report SHA256 `9E673D0514B407212479F2BBEF3990062A1D8966A4E874490AF68A2D3F31528B`.

Four additional real-hook fake-time cases pin exact550ms boundaries, same-request
replacement, obsolete generation/consumed-step rejection, reset and unmount.
Both suites pass6/6. Captured obsolete callbacks are deliberate reducer safety
controls, not proof that native timers fire twice. The original browser E2E,
5000ms timeout, visibility/observer behavior and all CSS/answer strings are
unchanged. No readiness gate or disabled early interaction was added.

React's [effect lifecycle](https://react.dev/reference/react/useEffect) explains
setup/cleanup symmetry and cleanup on changed dependencies/unmount; its
[StrictMode reference](https://react.dev/reference/react/StrictMode) identifies
the additional replay as development-only. The hook uses primitive dependencies
and owns only timer synchronization; user matching/start/reset stays in event
handlers. React best-practices review did not authorize unrelated UI refactors.

Targeted lint/typecheck pass. Corrected production build succeeds with build ID
`zF11IPrGs2SieWqHFpt3_`; browser verification remains pending. The generated Next
AGENTS heading matches the installed generator's H2 block, avoiding known dev
documentation drift without changing application behavior or instructions.
