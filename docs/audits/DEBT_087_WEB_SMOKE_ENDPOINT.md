# DEBT-087 — Configurable local Web smoke endpoint

Date: 2026-10-27. Baseline: accepted main `46395a7`.
Owner approved a separate design and test-only implementation package.

## Confirmed failure

PR96 head `1d6f3c9` local quality:full terminated exit1 at preflight, before
format, tests or build. No listener occupied3100; a direct loopback bind returned
EACCES. Windows reported TCP exclusion3028–3127, which includes3100. The original
guard incorrectly described every bind error as a busy/free-port problem.
Ignored original log: `node_modules/.cache/debt085-quality-1d6f3c9.log`.
This is an environment/preflight failure, not a failing application assertion.

## Agreed design before implementation

1. A pure test-infrastructure endpoint resolver owns the fixed loopback host,
   default3100 and explicit `DSS_WEB_TEST_PORT` override. Accept only canonical
   decimal ports1024–65535; reject empty, malformed, remote-URL and invalid input.
   Errors never echo raw environment values. No automatic port fallback.
2. A separate Node preflight owns bind/readiness/close, reports the actual bind
   error code and never stops/reuses a server. The full runner resolves one
   endpoint and checks it before the gate and before browser startup.
3. Playwright uses the same resolver for baseURL and its existing Next command.
   The manually created no-JavaScript context receives that baseURL explicitly;
   no application URL, assertion or browser timing is changed.
4. The sanitized browser environment forwards only the canonical test-port value
   in addition to existing safe variables. Existing secret stripping and no-reuse
   CI behavior remain mandatory.
5. Turbo explicitly forwards/hashes the override for Web E2E only. Web build,
   lint and typecheck inputs include the external resolver used by their typed
   Playwright configuration. No new global environment passthrough or business
   module dependency.

## Required evidence

- Default, custom, boundary and invalid-port resolution; no raw-value leakage.
- Deterministic bind-error, close-error and successful release regressions,
  plus a real occupied loopback socket negative control. No sleep/retry.
- Actual loaded Playwright configuration agrees on baseURL/server URL/port,
  retries0, forbidOnly under CI and reuse disabled under CI.
- Actual Turbo dry-run proves the E2E override is hashed and external helper
  inputs are present, without forwarding API credentials to Web tasks.
- Existing mandatory policy tests and full quality/build/strict E2E/Web gate
  on a verified available override. Default3100 remains unchanged for CI.

## Scope limits

No Windows reservation edits, Docker/WSL/service restart, dependency change,
runtime/UI or production endpoint modification. No DB reset, migration change,
timeout increase, retry, forced interaction or weakened assertion. PR96 and its
historical failure remain separate; this package does not fix DEBT-086.

Implementation and verification results will be recorded after they occur;
this design alone is not implementation acceptance or permission to merge.

## Implementation checkpoint

The resolver and separate socket preflight are wired into the runner. Browser
configuration explicitly binds loopback and the manually created no-JavaScript
context inherits baseURL; existing assertions remain. Only Web E2E forwards/hashes
the override, while relevant Web cache inputs include the external helper.

Before wiring, new integration controls exposed missing browser forwarding and
the old fixed Playwright endpoint. After wiring, `pnpm test:quality-policy`
passes21/21, including13 new controls and the actual runner's occupied-port
negative control. That control proves rejection before quality commands while
the socket owner remains listening; no DB is contacted. Web typecheck and
targeted config/smoke ESLint also pass. Candidate loopback3195 bound successfully.
The complete mandatory `pnpm test:full-policy` cohort passes67/67, including
existing API env-hash, real skipped-Jest rejection and coverage completeness controls.

These are scoped results, not full-gate or CI acceptance. The original PR96
preflight failure remains recorded. No Windows reservation, Docker or runtime
setting has changed. Full quality/build/API E2E/browser verification and owner
acceptance remain required for this separate package.
