# D4.1 — Gamification read boundaries

Date: 2026-10-13. Status: IMPLEMENTED increment / full D4 and acceptance OPEN.
Branch: `debt/d4-module-boundaries`, stacked on `173358d` / draft PR #9.
Authority and remaining full scope: [D4 plan](../development/D4_MODULE_BOUNDARY_PLAN.md).
No red parent PR is merged or treated as an accepted baseline.

## Implemented

Community Points, Levels and Achievements no longer import/inject UsersService.
Each owns its recipient-existence port. Users publishes an ID-only boolean read;
root composition performs adaptation. Levels consumes its own balance port,
adapted from a frozen Community Points scalar reader. No downstream service can
obtain ledger mutations, repositories, profile rows or credentials from that reader.

The three feature service exports and their Nest export entries are removed.
Four unused internal achievement data-type exports are also removed after a
repository-wide consumer inventory found no external use. Integration tests may
access owned internals directly; that is not a production module API.

No scoring weights, formulas, events, caps, deduplication, reversal, level
thresholds, achievement rules, account-state policies or public GraphQL schemas
are changed. Existing profile existence includes inactive accounts; this narrow
read deliberately preserves that behavior and is not authentication eligibility.
Missing profiles return false; read failures propagate without fabricated grants.

## Evidence

| Check                                  | Result                                                                                                |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Pre-/post-transfer characterization    | 21 existing service tests pass                                                                        |
| Full opt-in unit/integration run       | API 609, Web 59, Worker 36 pass                                                                       |
| Root coverage gate                     | PASS: API 517 pass / 92 opt-in skipped; Web 59, Worker 36, Storage 43 pass                            |
| Relevant AppModule E2E                 | 20 pass: new gamification plus groups/authorization/audit                                             |
| New full-schema gamification scenarios | 4 pass; real migrations, idempotency, reversals, level progress, achievements, missing/error behavior |
| Minimal reader/module tests            | 5 pass: ID-only projection, errors, private providers and adapters                                    |
| Root lint/typecheck                    | PASS                                                                                                  |
| Production build                       | PASS: API fresh; five unchanged package builds cached                                                 |
| Prisma validation/status               | PASS; all 53 migrations current; no schema/migration change in D4.1                                   |
| Architecture/license                   | PASS; 33 fixtures; inventory 135 → 128, zero additions                                                |
| Root formatting                        | RED: same 41 legacy files, DEBT-022                                                                   |
| GraphQL consistency                    | RED: unchanged DEBT-044 barrel comment drift; owned check side effect restored                        |
| Dependency audit                       | RED: unchanged 1 high / 10 moderate; no dependency changes                                            |
| Security patch regression              | PASS: 14                                                                                              |
| Full API/Web E2E and CI acceptance     | OPEN; inherited release blockers are not waived                                                       |

The coverage command intentionally omits opt-in DB/Redis flags; those 92 cases
are covered by the separate full opt-in run above, not claimed from coverage.

The reviewed baseline reduction removes exactly seven findings: three broad
concrete root exports and four foreign service imports. It adds no exemption
or newly permitted dependency. Achievements/Points/Levels named exports are
pinned by AST tests, and Nest metadata proves their broad providers stay private.
The remaining 128 findings are still D4 work, not compliance evidence.

## Isolation and ownership

The new real AppModule suite creates a UUID-named PostgreSQL schema, replays every
actual migration in order and overrides only the test Prisma client. Production
immutability triggers remain enabled. Teardown drops only that owned schema;
a subsequent DB query confirms zero `gamification_boundary_*` schemas remain.
The helper rejects non-loopback/non-dss_test connections and public-qualified DDL.
No shared Points rule, level definition, achievement fixture or public audit
history is changed by this new suite.

Existing foundation E2E files change imports only to remove dependence on public
service exports. Their known broader fixture-isolation concerns remain D6 work;
they are not silently repaired or represented as clean by the new isolated suite.

## Still required

Reputation evidence/blocks, Media combined profile responses, content/editor/
interaction/News/activity contracts, remaining wildcard/namespace surfaces,
non-infrastructure Prisma leaks, cycle review and final D4 enforcement/acceptance
remain open. D5–D7 and the mandatory Phase 11 brainstorm still follow.

Parent PR #9's observed CI: both containment jobs pass; dependency audit and
Web smoke fail. Quality passes migrations/lint/typecheck/coverage but its API E2E
step remains live at the last observation. This is a verified running job, not a
stopped process or a completed quality gate. No restart/cancellation is performed.
