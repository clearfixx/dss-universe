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
