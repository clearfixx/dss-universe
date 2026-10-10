# Phase 8 — Implementation and Acceptance Audit

Date: 2026-10-10. Status: **implemented; acceptance pending**.

The seven named packages exist: Reputation, Community Points, Levels, Custom Titles,
Achievements, Leaderboards and Gamification Frontend. This reconciles the old
roadmap `IN PROGRESS` with the final package's historical completion claim without
accepting the current red baseline.

## Definition of Done evidence

| Requirement                               | Concrete implementation/test evidence                                                                                                                                      | Acceptance boundary                                                             |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Explainable, reversible points/reputation | `modules/reputation` and `modules/community-points` repositories, application unit tests; `test/reputation-ledger.e2e-spec.ts`, `test/community-points-ledger.e2e-spec.ts` | E2E presence is not a current successful DB run                                 |
| Month/year/all-time rankings              | `modules/leaderboards/application/services/leaderboards.service.ts` UTC windows and repository; `test/leaderboards-foundation.e2e-spec.ts`                                 | No fresh ranking concurrency/load claim                                         |
| Anti-abuse                                | Reputation self/account-age/cooldown checks; points idempotency/day caps; achievements rule validation/rollback tests                                                      | Not proof that spam cannot dominate under every production workload             |
| Titles, groups and roles distinct         | Permission-neutral `custom-titles`; title grants/revocations and selection tests                                                                                           | Generic groups absent, Phase 5 remains partial; no implicit title authorization |

Paths above are relative to `apps/api/src/` for modules and `apps/api/` for tests.
Migrations include `20260728153000_add_reputation_ledger`,
`20260729093000_add_community_points_ledger`, `20260729113000_add_levels_foundation`,
`20260729123000_add_custom_titles_foundation` and
`20260729133000_add_achievements_foundation`.
Each uses its committed `migration.sql`; schema presence alone is not DB acceptance.

## Package specifications

- [Reputation](PHASE_8_REPUTATION_LEDGER.md)
- [Community Points](PHASE_8_COMMUNITY_POINTS_LEDGER.md)
- [Levels](PHASE_8_LEVELS_FOUNDATION.md)
- [Custom Titles](PHASE_8_CUSTOM_TITLES_FOUNDATION.md)
- [Achievements](PHASE_8_ACHIEVEMENTS_FOUNDATION.md)
- [Leaderboards](PHASE_8_LEADERBOARDS_FOUNDATION.md)
- [Frontend](PHASE_8_GAMIFICATION_FRONTEND.md)

Earlier package “next/deferred” lists are chronological, not current phase status.
No frontend modifications are made by this audit.

## Open exceptions, not accepted waivers

- Levels injects broad `CommunityPointsService` and `UsersService`; other gamification
  contexts also couple to Users. DEBT-003, D2/D4.
- Prisma representation leakage: DEBT-004, D4.
- Generic access groups are not Gamification-owned and are not delivered by titles:
  DEBT-024, D1/D2 scope decision.
- Full PostgreSQL/E2E, GraphQL and browser acceptance must be reproduced in D6.

D0.6 API unit suite passed 308 tests across the repository, including these unit
suites, but that is not a Phase 8-specific full runtime acceptance certificate.
Owner review and D6/D7 remain required; no historical exception is accepted here.
