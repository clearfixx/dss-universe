# D3.5 — Access groups implementation evidence

Date: 2026-10-13. Status: IMPLEMENTED / review and full acceptance pending.
Branch: `debt/d3-5-iam-access-groups`, stacked on `04a9d50` / draft PR #8.
No parent review branch is merged or represented as an accepted baseline.

## Delivered scope

Owner-approved full D3.5, not only the earlier Premium gate increment:

- separate IAM-owned groups and immutable, attributable membership periods/revocation;
- reserved non-staff Premium, distinct from system Role/RolePermission authority;
- explicit closed Knowledge Forge Guardian capability and current decision contract;
- atomic audit, group/membership locks and real concurrency/rollback tests;
- root-composed Auth eligibility, IAM evidence and Authorization decisions;
- namespaced group audiences, legacy system-role compatibility and safe profile display;
- protected REST management/history API, additive migration and read-only preflight.

See [ADR-006](../architecture/adr/006-isolated-access-groups-and-capabilities.md)
for the authority, threat boundaries and recovery strategy. No frontend design,
owner policy, Command Deck feature, Phase 14 sanction or Phase 11 workflow is implemented.

## Verification

Environment: Windows, Node 24.18.0, pnpm 11.9.0, Docker PostgreSQL 17 test database
`127.0.0.1:5434/dss_test` and Redis `6380`. Dev/production DBs are untouched.

| Check                              | Result                                                                                    |
| ---------------------------------- | ----------------------------------------------------------------------------------------- |
| All 53 migrations on disposable DB | PASS; actual SQL also tested in owned schemas                                             |
| Repeated migrate deploy and seed   | PASS; no pending migrations                                                               |
| Prisma validate/generate           | PASS                                                                                      |
| Root lint and typecheck            | PASS                                                                                      |
| Full forced unit/integration run   | PASS: API 604, Web 59, Worker 36                                                          |
| Relevant real AppModule E2E        | PASS: 16 tests in groups/authorization/audit suites                                       |
| Production build                   | PASS: API fresh, five unchanged package builds cached                                     |
| Architecture/license checks        | PASS; 30 analyzer fixtures, 135 existing D4 findings, no growth                           |
| Repository format                  | RED: unchanged 41 legacy files (DEBT-022)                                                 |
| Migration/schema drift check       | RED outside new IAM tables; DEBT-049                                                      |
| Dependency audit                   | RED: existing 1 high / 10 moderate, no dependency changes                                 |
| Security patch regressions         | PASS: 14                                                                                  |
| Generated GraphQL consistency      | RED: reproduced DEBT-044 generated barrel comment drift; owned check side effect restored |
| Full API/Web E2E                   | Not rerun in this package; existing DEBT-034/038/045/048 remain release blockers          |
| CI / owner review                  | Pending; not an acceptance certificate                                                    |

Opt-in unit DB suites use `RUN_AUTH_DB_TESTS=1`, `RUN_RECOVERY_DB_TESTS=1`,
`RUN_AUTH_REDIS_TESTS=1`, `RUN_IAM_DB_TESTS=1`, with the explicit test URL/Redis port
and `pnpm test:unit --env-mode=loose --force`. Relevant E2E:
`pnpm --filter @dss/api test:e2e --testPathPatterns='access-groups.e2e|authorization.e2e|audit.e2e'`.

## Security evidence

Fifteen IAM persistence tests execute the actual migration in uniquely owned
schemas. They cover exact expiry, future starts, indefinite/overlapping grants,
disable/re-enable, forged names/kinds/permission input, closed capability values,
immutable history, safe public projection and all mutation/audit failure boundaries.
Two competing revocations are observed waiting on actual PostgreSQL locks, then
produce the same historical result and exactly one revocation audit.

Content Gate integration now uses real IAM membership, Auth eligibility,
Authorization role evidence and editor projection. Premium never bypasses GROUP,
both ALL/ANY redact denied payloads, inactive subjects deny, and audience/Premium
revocation is effective on the next projection. Pure policy tests also prove that
reserved-prefix system-role names cannot impersonate group audiences.

Five new full-stack HTTP tests cover runtime DTO validation, actual mutation
authority, privilege forgery denial, independently held staff rights, Guardian
lifecycle, overlap, history pagination, expiry, hidden display, atomic audit
rollback and unavailable evidence. Existing same-token REST/GraphQL and audit
regressions still pass. Error logs from deliberately injected failures are expected.

The actual test migration retains its constraints. Owned-schema fixtures drop
only their unique schema. Full AppModule HTTP fixtures use a guarded teardown:
only loopback `dss_test` as `dss_test`, exact fixture UUIDs, transaction-held table
lock, temporary disable of the single membership-history trigger, exact subject
cleanup and trigger re-enable before commit. Failure rolls back DDL and deletion.
This privileged test utility is not exported, called by production, or a retention API.

## Rollout evidence and remaining acceptance

Read-only `apps/api/prisma/maintenance/access-group-preflight.sql` returns three
empty result sets on the seeded disposable DB: no legacy Premium roles,
reserved-prefix roles or GROUP keys. No automatic grant conversion is needed
there. Real production assignments must be inventoried and explicitly mapped;
no production entitlement continuity or migration acceptance is claimed.

Do not merge while required gates remain red. D3/D3.5 stack review, D4 boundaries,
D5 Passports, D6 quality/drift and D7 release gate still precede Phase 11.
