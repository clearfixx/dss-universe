# DEBT-093 — Community Points E2E timing investigation

## Retained failure

PR120 head6c3634f has green CI8/8, E2E688/688 and coverage1466/1466. Its
local full gate is red:687/688 E2E. The single scenario
`keeps event awards idempotent, capped, explainable and reversible` timed out
at5007ms under the unchanged5000ms limit; the same CI assertion took2267ms.
The full gate stopped before local build/Web. No root cause or causal Joi
regression is established.

Local evidence: `node_modules/.cache/quality-full-N9zfJW/api-e2e.json`, SHA256
`6020EE8A16BD40F7F10CB00789CB39E8A83ADF4B761A707E952D27F55A161ECD`.
CI evidence: run41155375237, artifact13024009773, exact head6c3634f.

## Approved diagnostic boundary

Owner authorized a separate diagnostic/test package. The existing single
scenario performs three real registrations, a real login, concurrent event
consumption, cap/duplicate checks, history reads, moderation reversal, rule
configuration and immutability/reordering checks. Their aggregate cost is a
hypothesis to measure, not a proved explanation for the retained failure.

Opt-in `DSS_POINTS_E2E_TIMINGS=1` records stage labels, monotonic durations,
scenario-relative time and fulfilled/rejected status. It records no credentials,
tokens, emails, payloads or exception text. Real operations and existing
assertions remain; unknown errors are rethrown unchanged. Normal runs do not
emit timings. The maintained helper runs one isolated observation with the
existing Jest timeout, retaining stdout and JSON even on failure.

No runtime/Auth/crypto correction, timeout increase, mock Auth, sleep, retries
or assertion weakening is permitted. An observed passing diagnostic run would
not by itself establish the original failure's cause. Runtime findings require
separate approval; DEBT-092/093 and package acceptance remain open.

## First measured observation and fixture correction

Exact diagnostic head189620d reproduced the timeout in a single isolated run.
The retained log is
`node_modules/.cache/debt093-8339d846980542639e0ca89837390245.log`.
Measured stages:

| Stage                          |     Duration ms |
| ------------------------------ | --------------: |
| Register ledger user           |         1481.14 |
| Register moderator             |         1070.73 |
| Login moderator                |         1095.51 |
| Register reordering user       |         1208.68 |
| First concurrent consume calls | 116.30 / 121.08 |
| History before reversal        |           77.58 |
| GraphQL reversal               |           91.94 |
| Rule update                    |           43.46 |
| History after reversal         |           46.28 |

The first two registrations consumed about2554ms of scenario elapsed time.
After login, reversal and history, the third registration was still in flight
when cleanup began at5018.64ms; registration completed at5457.35ms. Later
continuations overlapped cleanup, including an unsuccessful final history read.
The diagnostic run is red and retained, not replaced by a passing observation.

This demonstrates an oversized fixture-preparation path within this observed
ledger assertion budget; it does not diagnose the OS/crypto cause of different
host latency or every historical timeout. No runtime correction is justified.

The test-only correction prepares the three users in separate sequential setup
hooks, then grants the same two moderator permissions and performs the same
real login in a further hook. Each hook retains Jest's existing5000ms deadline;
the ledger scenario also retains5000ms. No operation is mocked, removed or
parallelized. Permission-count and all ledger assertions remain. The third
user's preparation now occurs earlier, but none of its ledger events occur
until the same final reordering scenario. API/DB/runtime code is unchanged.

Focused corrected observation, full local gate, CI and owner acceptance remain
pending. Opt-in timings are diagnostic observations, not a performance SLA.
