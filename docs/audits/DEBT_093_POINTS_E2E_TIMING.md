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
