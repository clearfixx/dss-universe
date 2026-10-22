# DEBT-076 — Web coverage timeout diagnosis

The second DEBT-015 full gate stops at Web coverage: 57/60 tests passed,
three exceed the existing 5000ms timeout:

- NewsPagination: both controls and active loaded pages.
- MembersDirectory: presence metrics and profile links.
- ProfileSettingsView: completion, owner controls and current session.

All 60 passed during the first gate invocation. No related Web source was
changed between runs. This is evidence of inconsistent test completion, not
proof of its cause. A post-failure memory snapshot is not a measurement of
resource contention during the tests.

Raw evidence: `dss-d6-quality-full-after075.log` in temporary storage.
Next: diagnose test/process scheduling and environment before proposing a fix.
Do not increase timeouts, weaken assertions, modify UI or rerun blindly.
DEBT-015 acceptance stays open; no new remote green result is claimed.

## Controlled diagnostic comparison

No source or assertions changed. Two sequential direct Web coverage invocations
both pass all 60 tests / 26 files with unchanged coverage totals:

| Invocation                            | Pagination | Members | Settings | Suite wall time |
| ------------------------------------- | ---------- | ------- | -------- | --------------- |
| `--maxWorkers=2 --reporter=verbose`   | 341ms      | 672ms   | 624ms    | 33.83s          |
| default workers, `--reporter=verbose` | 1387ms     | 2812ms  | 3010ms   | 18.16s          |

The two-worker run was observed live with two Vitest fork processes. Host Node
reports 12 available CPUs; Web config has no worker limit. The default run
finished before its process snapshot, so no observed default-worker count is
claimed. The slower per-test measurements with more default parallelism support
a contention hypothesis, not proof of the original failure's exact cause.

Raw logs: `dss-d6-076-web-two-workers.log` and
`dss-d6-076-web-default-workers.log` in temporary storage. No full-gate rerun was
performed during this diagnostic comparison.

The owner approved bounding Web Vitest to two workers, preserving all tests,
assertions, coverage and existing timeout. This trades suite throughput for
per-test execution headroom; no UI/runtime changes.

The config now sets `maxWorkers: 2`. A Node regression resolves the actual
installed Vitest configuration for coverage on/off and checks the worker limit,
5000ms test timeout, no retries/bail, jsdom and unchanged V8 coverage provider.
Both checks pass and are included in CI's existing `test:full-policy` command.
The initially authored regression incorrectly assumed every implicit default
was materialized in the resolved object; it was corrected to account for absent
retry/bail/fileParallelism defaults. This did not change Vitest settings.

Configured Web coverage (no CLI worker override) passes all 60 tests; the three
cases take 510ms, 674ms and 953ms. Coverage totals match both diagnostic controls.
Web lint and typecheck pass. Raw evidence: `dss-d6-076-web-configured.log`,
`dss-d6-076-web-lint.log`, `dss-d6-076-web-types.log` in temporary storage.
Full-gate and remote acceptance still require fresh evidence.
