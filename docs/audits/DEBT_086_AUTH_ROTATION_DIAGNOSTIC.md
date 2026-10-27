# DEBT-086 — real authentication rotation timing

Status: approved diagnostic/test-only package; root cause remains open.
Date: 2026-10-27. Baseline: main a8c71fa.

## Evidence and limits

PR96 head 60105a4 failed its local full gate: API E2E 622/623,
zero pending; the rotation test exceeded the unchanged 5000ms deadline
(reported 5003ms). The same head passed CI 623/623; this case took 2247ms.
Neither observation identifies a defective Auth operation or a fixture cause.
The failed local gate did not reach its build/Web stages.

## Instrumentation

`DSS_AUTH_ROTATION_DIAGNOSTIC=1` enables monotonic elapsed/stage timings
inside the existing real HTTP test. It logs stage names and milliseconds only,
not credentials, tokens, identities or response bodies. Requests, ordering,
assertions, production crypto and the Jest deadline remain unchanged.

One focused diagnostic run on disposable PostgreSQL5434/Redis6380 completed
with exit0: 1 passed, 26 intentionally excluded by the name filter.
This is not a full-suite or full-gate pass and does not close the defect.

| Completed stage                                  | Stage ms | Total ms |
| ------------------------------------------------ | -------: | -------: |
| Registration                                     |      812 |      812 |
| Email change                                     |      331 |     1142 |
| Old registration token rejected                  |       22 |     1164 |
| Login after email change                         |      531 |     1696 |
| Password change                                  |      494 |     2190 |
| Final login, including preceding token rejection |      503 |     2692 |
| Audit verified                                   |       12 |     2704 |

These timings do not reproduce the timeout. Most observed time is within
successful credential-related requests, but this does not distinguish crypto,
database, scheduling or other runtime work. No optimization is justified yet.
The initial run combined the second token rejection with final-login timing;
the next suite-context diagnostic separates those checkpoints.

## Whole-file context

The subsequent whole-file run passed 27/27 with exit0 in 32.849s.
The rotation case reached its final audit assertion at 2555ms:
registration550, email-change293, first token rejection13, email-login536,
password-change539, second token rejection13, final login602, audit8ms.
Minor rounding differences are expected. This run also does not reproduce
the full-gate deadline. Expected synthetic failure logs belong to other
negative tests in the same file, all of which passed.

The subsequent all-file diagnostic completed with exit0 in 503.951s:
623/623 tests, 58/58 suites, zero failures or pending tests. The rotation
assertion took 2254ms, with one invocation and no retries. The command did
not explicitly enable the strict full-gate environment; these are observed
report counts, not a claim that the whole quality gate ran.

Ignored JSON evidence: `node_modules/.cache/debt086-api-e2e.json`.
SHA256: `d13320970abf5b399d9ddbdcba4b1a323f56f05c6912c741074b98cfa3695c40`.
The captured all-file console output did not contain stage checkpoints;
only the Jest assertion duration is available for this context.

## Diagnostic conclusion

The timeout was not reproduced in focused, whole-file or all-file diagnostics.
No test/fixture defect or runtime root cause has been demonstrated. Therefore
there is no justified correction yet, and DEBT-086 remains open. In particular,
passing diagnostic runs do not supersede PR96's failed local full-gate result.
The next experiment must retain timing instrumentation through the strict
full-gate execution context; do not weaken crypto, assertions or deadlines.

Scoped checks: API typecheck, targeted ESLint, Prettier and `git diff --check`
passed. Build, coverage, security and Web checks were not run for this package.

## Boundaries

No runtime/Auth/crypto changes, Auth mocks, increased deadlines, retries,
sleep, assertion weakening or database resets. Any demonstrated runtime fix
requires separate approval. A passing diagnostic is not rerun-to-green acceptance.
