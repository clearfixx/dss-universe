# DEBT-064 — Custom Title selection lifecycle serialization

Date: 2026-10-18. Branch `debt/custom-title-selection-atomicity`.
Baseline: `c457145` / draft audit PR #38. Implementation and acceptance pending.

Owner approved a separate correction and the shared-title/per-user lock design.
The prior audit proved both races with actual migrated PostgreSQL; its green
diagnostics characterized invalid final selections, not accepted behavior.

## Invariant and lock order

A committed selection must not retain a grant revoked by a completed concurrent
revoke, or a title deactivated by a completed concurrent update. Existing
cooldown, retained grant history, Audit/Outbox and public API remain unchanged.

- Select: existing per-user selection lock; owned ID-only grant/title anchor;
  shared advisory transaction lock for that title; fresh eligibility/current/
  settings reads; existing policy and selection/evidence writes.
- Revoke: existing grant-ID lock; owned ID-only recipient anchor; same per-user
  selection lock; fresh grant/selection read; conditional deletion by user AND
  grant; revocation/evidence writes.
- Definition update: existing definitions lock; exclusive advisory transaction
  lock for the title before reading/deleting selections and changing definition.
  It never acquires per-user locks. Create and settings are unchanged.

Anchor reads route locks only, never authorize eligibility. Shared/exclusive title
locks use the same namespace/key. Different users can select the same title
concurrently; there is no new global selection mutex. Definition writes retain
their pre-existing definitions mutex. No new tables, isolation, timeout, API,
permissions, retries or frontend changes are introduced.

Conditional selection deletion also tolerates a concurrent deactivation already
removing that row, without P2025 or deleting another grant. Grant/deactivation
and settings-policy freshness are not claimed corrected by this package.

## Current evidence

Seven migrated PostgreSQL regressions pass (12.533s): select first versus revoke
and deactivate; mutation first versus select in both cases. Query observers
pause only after real reads/writes. Each test observes an actual ungranted
advisory lock for its unique coordinate before release, checks final absence of
selection and retained revoked/inactive grant, and verifies sequential denial.
Mutation-first select returns NOT_FOUND/INACTIVE; select-first returns OK and
the following mutation clears selection. History protections stay enabled.

Initial test schedule incorrectly awaited mutation before observing contention;
that harness error was corrected, not waived. Existing pg concurrent-query
deprecation warning is still visible. No live HTTP/queue claim is made here.
Three additional cases inject Outbox failure after real Audit append for select,
revoke and deactivate. They prove unchanged selection/grant/title rows and
unchanged Audit/Outbox counts after transaction rollback. No successful result
is mocked. Further cooldown/history reconciliation and full quality gate,
build, CI, review, publication and owner acceptance remain required. Debt stays
open; this is not complete D4 acceptance or permission to start Phase 11.

API opt-in unit coverage passes 1101/1101 across 148 suites (49.25s), normal
exit 0. Root lint passes 9 tasks. Current root typecheck/build and remaining
gates are running; full E2E/GraphQL have not yet been run for this correction.
