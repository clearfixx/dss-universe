# DEBT-085 — Arrival can start after early keyboard focus

Date: 2026-10-26. Status: OPEN; separate runtime scope approved, production check
and lifecycle design required before implementation.

## Evidence availability errata — 2026-10-27

The four local October26 DEBT-084/085 trace ZIPs and original failure page
context are no longer available under D6 `apps/web/test-results`. No matching
cache backup was located in the checked D5/D6 archives; Git does not contain
these ignored artifacts. See the [retention errata](DEBT_084_KEYBOARD_SMOKE_POINTER_INTERCEPTION.md#evidence-availability-errata--2026-10-27).

The previously stated preservation is not a current availability guarantee:
normal Playwright output cleanup invalidated that storage arrangement. Recorded
hashes, observations, committed regressions and separate quality reports remain,
but they do not replace the unavailable raw traces. No original recovery or new
production re-verification is claimed here. Future browser evidence must be
written or copied outside the output root before another Playwright invocation.

DEBT-084's controlled dev experiment focuses a real question before arrival
effect setup, then uses real Enter. Search starts while arrival remains playing;
the visible Cancel control is clipped and hero wins browser hit-testing. See
[bounded evidence](DEBT_084_KEYBOARD_SMOKE_POINTER_INTERCEPTION.md). This is not
yet production proof or a claim about every natural first-visit ordering.

The owner authorized production verification, then a minimal lifecycle design
and correction of the confirmed cause. Preserve early interactions and existing
focus/cancellation semantics. No UI redesign, blocking early actions, forced
click, sleeps/retries, timeout increases or weakened smoke assertions. Existing
search timer lifecycle and normal first-visit/replay behavior must be preserved.

No runtime correction is included in this initial record. DEBT-084 stays a
separate diagnostic/test package and the failed PR94 full gate is not waived.

## Production reproduction and correction design

A fresh Web production build completed successfully. One controlled diagnostic
against next start on isolated port3194 reproduces the same boundary: playing,
Cancel present, hero receives pointer, console clip-path inset(0px 50%). Trace
SHA256 `869CD85F90562AE518875032F71B6BEAF17EEE15182889F2CF6BE47FC2911911`.
This is controlled scheduling evidence in production, not attribution of every
natural smoke failure. No runtime/UI change was present during reproduction.

Minimal design: at initial effect setup, detect focus already inside the scene,
excluding the existing skip control. Complete the arrival through the existing
finish path rather than starting an animation over an interaction. This extends
the current focusin behavior to focus that happened before listener installation.
Unfocused first visits still animate; replay remains explicitly user-triggered
and does not use this initial-setup decision. Search scheduling is unchanged.

Verify early-focus setup in normal and StrictMode component lifecycles; normal
unfocused first visit and explicit replay; real cancellation hit-testing and
focus restoration in dev and fresh production. No CSS/hit-testing override,
animation duration change, disabled early interaction or readiness delay in the
application is required. The owner approved this scoped correction after
production verification and design; implementation proof remains pending.

## Runtime correction checkpoint

Initial effect setup now uses the existing finish path when focus is already
inside the scene (excluding its skip control). No CSS, durations, dependencies,
search timer or replay callback changed. React review checked unchanged listener
cleanup and effect dependencies; no additional framework or subscription added.

Two new early-focus component cases first failed on the old runtime (normal and
StrictMode both remained playing). After the guard, component/search suites pass
9/9, including unfocused initial animation, explicit replay and cancellation.
The controlled browser case now asserts ready, real Cancel pointer receipt,
clip-path none, a real click and restored input focus. Original keyboard smoke
was restored to its uninstrumented action order; no observation await remains
before its Cancel click. Dev browser regression suite passes15/15, retries0,
two workers,32.8s. Historical trace availability is superseded by the errata above.

Fresh post-correction production verification and full quality gate remain
pending. This is not acceptance or a claim that every historical failure shares
the same cause. DEBT-084 diagnostic evidence is not relabeled as a fix.

## Post-correction production checkpoint

Fresh Web build passes. The same controlled scenario against isolated next start
port3194 now passes1/1 with real cancellation and restored input focus, retries0.
Actual trace payload: receivesPointer true, arrival ready, clipPath none. Trace
SHA256 `69D0897AAD778B56DC39351BAA771AA60AAD43DAD2A56D2EF400D59C49E3F8A8`.
Targeted ESLint and Web typecheck pass. Original pre-fix dev and production traces
were present at this checkpoint; their later loss is recorded above. Full quality gate,
CI and owner acceptance are still pending.

## New controlled production comparison — 2026-10-27

This is new verification after the retention loss, not recovery of the missing
October26 traces or attribution of the original natural smoke timing.

Both revisions received their own successful production build before one
controlled Chromium scenario each, with one worker, retries0, server reuse off
and isolated port3194. The server/browser environment was sanitized with the
existing browser-environment helper and NODE_ENV production. No application,
CSS, assertion or deadline was edited during this comparison.

| Boundary                                   | Pre-fix `c5966e4fa012dd87cef1a315776bd6190f7abc43` | Corrected `c83150c8827f569bdb84a1eb1a3e5a711407cf68` |
| ------------------------------------------ | -------------------------------------------------- | ---------------------------------------------------- |
| Arrival after controlled early focus       | playing                                            | ready                                                |
| Cancel receives pointer                    | false; hero receives pointer                       | true                                                 |
| Console clip-path                          | inset(0px 50%)                                     | none                                                 |
| Real Cancel click and restored input focus | Not attempted after broken hit-test                | Both verified                                        |
| Diagnostic result                          | 1/1 expected characterization, no retries          | 1/1 regression, no retries                           |

The pre-fix scenario intentionally asserts the broken hit-test; its passing
characterization does not mean that revision is safe. The corrected scenario
also performs the real click and verifies the question input is focused.
There are no DB or AI-provider operations in this local demo story.

New raw evidence is outside the default Playwright output root under
`node_modules/.cache/debt085-reverification-20261027/`:

- Pre-fix trace: `pre-fix-production/arrival-keyboard-lifecycle-b7c37--hit-testing-during-arrival-chromium/trace.zip`;
  SHA256 `535db4ff15349dac9872f73e2cd8eaf02db9076a0bd583ce6b91d5af0af349db`.
- Corrected trace: `post-fix-production/arrival-keyboard-lifecycle-beeda-es-cancellation-hit-testing-chromium/trace.zip`;
  SHA256 `5485a899671289aeae72f18bd6ebdd555b9b532d7a9e5193231eac93c5788b42`.
- Pre-fix JSON report: `pre-fix-production-report.json`;
  SHA256 `c30e83c86da579845c4bcb03de753d592fbe080b87136c62e2ada1d185ba0079`.
- Corrected JSON report: `post-fix-production-report.json`;
  SHA256 `4626392fff2c340a808535ced91b0ace8a6a3a6c83f2bbe21442bfcf3d3f185e`.

Each report has expected1, skipped0, unexpected0, flaky0 and retry0. The pre-fix
ZIP hash was rechecked unchanged after the corrected run. Logs and a provenance
manifest are retained separately in the cache; no default output-folder snapshot
is represented as a durable archive. The old missing originals remain missing.
This restores current controlled production evidence, not full package acceptance.
The exact integration full gate/CI and owner review remain required.
