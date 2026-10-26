# DEBT-085 — Arrival can start after early keyboard focus

Date: 2026-10-26. Status: OPEN; separate runtime scope approved, production check
and lifecycle design required before implementation.

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
