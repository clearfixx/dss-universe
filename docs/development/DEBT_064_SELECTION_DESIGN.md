# DEBT-064 — Custom Title selection lifecycle serialization

Date: 2026-10-18. Branch `debt/custom-title-selection-atomicity`.
Baseline: `c457145` / draft audit PR #38. Implementation checkpoint `0413058`;
full verification and acceptance pending.

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

Seven migrated PostgreSQL regressions pass (12.533s). Four cover select first versus revoke
and deactivate; mutation first versus select in both cases. Query observers
pause only after real reads/writes. Each concurrency case observes an actual ungranted
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
is mocked. Existing custom-titles-foundation HTTP/GraphQL regression explicitly
checks unchanged selection, cooldown refusal and zero-cooldown switching,
revocation/history, inactive definitions and immutable grant deletion. It is
included in the currently running full E2E; a previous packet's pass is not a
substitute for its current result. Full quality gate,
build, CI, review, publication and owner acceptance remain required. Debt stays
open; this is not complete D4 acceptance or permission to start Phase 11.

API opt-in unit coverage passes 1101/1101 across 148 suites (49.25s), normal
exit 0. Root lint/typecheck pass 9 tasks each. Prisma validation and architecture
checks pass their current bounded scope; frozen inventory is unchanged at 84
known findings, not waived. Global format reports 41 inherited files. The
production-only dependency audit reports 1 high/9 moderate (not the same scope
as the preceding all-dependency audit). Build passes 6/6 tasks (20.502s).
Full E2E is running on freshly recreated, verified disposable tmpfs loopback
5435 after zero-client checks, migrations and no seed. GraphQL remains pending.

The attempted fresh Editor/Storage/Worker/Web/patch and all-dependency audit
command was not executed: automatic approval review returned an account usage
limit error. This is an approval-service failure, not an unsafe-action decision.
Do not bypass it or reuse parent results as current evidence. The already-running
full E2E remains live and is observed through its existing session; temporary
test uploads must not be removed while that run owns them. Publication and
remaining gated commands require the approval service to become available.

Follow-up: approval service recovered; the rejected command was then actually
executed. Fresh Editor 23, Storage coverage 43, Worker coverage 46, Web coverage
59 and dependency-patch 14 tests pass. Full dependency audit remains red at
1 high/10 moderate vulnerabilities. This supersedes the availability blocker,
not the remaining E2E/GraphQL/publication/acceptance requirements.
