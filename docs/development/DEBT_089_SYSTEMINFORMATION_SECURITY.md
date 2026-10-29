# DEBT-089 — systeminformation Windows command injection

Status: isolated security correction candidate; acceptance open.
Baseline: accepted main5d6db1d. Discovered during the separate Mailpit PR106 gate.

## Confirmed evidence

Both local security:check and GitHub dependency audit reject
[GHSA-3f7j-7jwc-fxfj](https://github.com/advisories/GHSA-3f7j-7jwc-fxfj), high.
The advisory entered GitHub's database on2026-10-28. The existing lockfile
resolves systeminformation5.33.15 through OpenTelemetry host metrics and the
shadcn/registry dotenvx paths. Upstream identifies5.33.16 as the fixed version;
its release and npm integrity were checked. This does not prove a remotely
reachable DSS exploit, and no exploit or PowerShell payload is executed.

## Scope and authorization

The owner permits safe patch/minor dependency updates. This isolated packet
changes only the vulnerable5.x transitive resolution to5.33.16, adds actual
consumer-path security-floor assertions, and preserves the existing audit gate
and approved braces exception. No new waiver, framework/stack change, API/UI
change or database migration. The package is required to unblock the active
package's mandatory security gate; it is kept separate from Mailpit.

## Verification and integration

Inspect the resolved lockfile graph and frozen install, run the actual-path
regressions, security audit and full local quality gate, then require green CI
and owner acceptance before merge. After acceptance, integrate into Mailpit's
branch and rerun its full gate. The original Mailpit failure log is retained as
node_modules/.cache/mailpit-quality-31b8e1c.log (exit1 at security:check).
Working Mailpit host protocols and preserved messages do not close that gate.

Initial verification: the added actual-path assertion rejects installed5.33.15;
after the patch, all5 dependency-path tests pass and security:check exits0.
The lockfile changes only this package, its integrity and the two parent
snapshots; no unrelated version changed. Frozen installation succeeds. Full
quality/CI remains required before acceptance.
