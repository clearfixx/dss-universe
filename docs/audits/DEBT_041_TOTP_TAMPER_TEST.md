# DEBT-041 — Deterministic authenticated-envelope tamper test

Date: 2026-10-22. Separate D6 test-only checkpoint.
Status: local quality verified; combined coverage/E2E and remote review open.

The pre-existing test replaces the final Base64url character with `x`, which
can already be `x` in a random ciphertext. The failing full quality run
`dss-d6-presence-quality.log` is retained:1280/1281 tests passed. This does not
establish a production AES-GCM authentication bypass.

The correction decodes an envelope component, flips a defined bit in a copied
byte buffer and re-encodes it. Each IV, tag and ciphertext case verifies the
bytes and envelope really differ, confirms the untouched envelope decrypts,
and still requires corrupted decryption to throw. Random IV generation remains
real; no crypto mocks, random reruns, runtime changes or weaker assertions.

This is the deterministic byte-corruption correction already scoped by the
DEBT-041 D6 entry. It is separate from the Worker identity and Users presence
checkpoints. Full combined gates/CI are required before declaring acceptance.

Focused TotpService tests pass6/6, natural exit0,1.129s; log:
`dss-d6-totp-tamper.log` in local temp. A deterministic byte fixture whose
Base64url encoding ends inx independently reports
`legacyReplacementChangedBytes: false`, `byteFlipChangedBytes: true`.
This demonstrates the old oracle's no-op without relying on repeated random
encryptions or weakening the authenticated-decryption assertion.

After this correction, the complete `pnpm quality` naturally exits0:
API1284/1284 in170 suites with zero skips, Worker50/50, Web60/60,
policy33/33, build/post-build check and architecture140/140 with zero findings.
The preserved final log is `dss-d6-combined-quality.log`. Combined fresh
coverage/E2E and new-head GitHub CI remain required; prior green checkpoint
evidence must not be attributed to this test change.

The final combined fresh coverage and same-DB E2E now pass locally as well:
API coverage1284/1284, full E2E590/590 in54 suites, zero skips/runtime errors.
See [current D6 evidence](D6_FULL_QUALITY_BASELINE.md). New-head CI/review and
phase acceptance remain open.
