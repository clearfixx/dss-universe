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
