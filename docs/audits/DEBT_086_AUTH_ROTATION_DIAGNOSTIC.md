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

At the initial checkpoint, only API typecheck, targeted ESLint, Prettier and
`git diff --check` had passed. The later full-gate results supersede that
limited verification scope, not the original failed PR96 result.

## Strict gate and CI checkpoint

Exact code head `e264907dbc29fba80addc0bf1854e8f6ea54e497` completed one local
`pnpm quality:full` with exit0 (process session59229, now terminal):

- Format, architecture140/140, Prisma validation/generation and zero drift.
- Lint/typecheck, full-test/quality/security policies and high0/critical0 audit;
  approved braces patch verified with14 passing regressions.
- Coverage8/8 tasks, including API1327/1327 across173 suites.
- Strict API E2E623/623 across58 suites, zero pending, in498.845s.
- Rotation2371ms, one invocation, no retry.
- GraphQL generation check, build6/6 (5 cached), post-build HTTP/entry2/2.
- Fresh no-reuse Web smoke14/14 in50.2s, retries0.

Ignored evidence:

| Artifact                                                 | SHA256                                                             |
| -------------------------------------------------------- | ------------------------------------------------------------------ |
| `node_modules/.cache/quality-full-uu76Uy/api-e2e.json`   | `531460bfffdf1553d7746c88efee198e657f8f1f49a8512e107d542ff4271953` |
| `node_modules/.cache/quality-full-uu76Uy/web-smoke.json` | `27c69aa847394cab4ba73739c2040bf0f7ba0151ad0872cc73242108e39859f4` |
| `node_modules/.cache/debt086-quality-e264907.log`        | `9d7afcf814cf292f80738665d95d3ae3eae94e3591da1215c127ccc8b0201d88` |

Same-head GitHub Quality run40442077401 and containment run40442077397
completed5/5 checks successfully. Downloaded API report623/623,58 suites,
pending0; rotation1540ms, one invocation. SHA256:
`b7399168b7bdc5cbd62b8cd237d748d90552ee145f4e7287aa411805e9de0946`.
CI Web14/14 in26.5s with retries0. No acceptance or merge is inferred.

## Why passing full-suite logs hide checkpoints

The installed Jest30.5.2 core selects `AgentReporter` when a nonempty agent
environment marker exists; the current environment has `CODEX_THREAD_ID`
(its value is neither needed nor recorded). `AgentReporter.onTestResult`
prints buffered file output only for failures. Single-file automatic verbose
mode uses an immediate console, explaining the visible focused checkpoints.

This follows the installed `@jest/core` reporter selection, `jest-runner`
console selection and `@jest/reporters` AgentReporter implementation; it is
not evidence that JSON itself drops diagnostics or that Auth lost its context.
A separate focused JSON probe printed all stages. An explicit default-reporter
probe with `--json --verbose=false --reporters=default` also printed all nine
checkpoints, reaching audit2468ms. Each probe passed1 test with26 deliberately
excluded by its name filter; neither is a full acceptance run or a timeout fix.

The project reporter, global configuration, runtime and assertions remain
unchanged. For future passing-stage diagnostics use an explicit reporter in
the investigative command rather than weakening or globally changing the gate.
This explains missing output, not the original5003ms timeout. DEBT-086 remains
open; a demonstrated fixture correction or separately approved runtime fix is
still required before claiming closure.

## Boundaries

No runtime/Auth/crypto changes, Auth mocks, increased deadlines, retries,
sleep, assertion weakening or database resets. Any demonstrated runtime fix
requires separate approval. A passing diagnostic is not rerun-to-green acceptance.
