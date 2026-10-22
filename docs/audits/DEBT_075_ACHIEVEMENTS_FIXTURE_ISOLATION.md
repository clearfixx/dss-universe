# DEBT-075 — Achievements E2E fixture isolation

## Confirmed evidence

The first DEBT-015 full gate stops with 592/593 E2E tests passing. In
`apps/api/test/achievements-foundation.e2e-spec.ts`, concurrent consumption
expects one AWARDED and one DUPLICATE, but receives two of each.

The fixture creates uniquely named active definitions and enabled rules for
shared semantic event names. It uses the common test database. Its cleanup
removes achievement Outbox rows but does not remove/deactivate its rules.
The repository matches all enabled rules for the event. A read-only query after
failure confirms two enabled, active-definition rules for
`community.topic.published.v1`. Earlier disposable-DB runs were green; a reset
would hide this repeat-run isolation defect, not repair it.

## Approved separate correction

The owner approved isolation using the existing migrated private-schema fixture.
AppModule receives that fixture's Prisma provider; teardown drops only its owned
schema instead of deleting all achievement Outbox rows from the shared database.
All award/idempotency/cap/rollback assertions remain unchanged. The migration
setup uses the existing fixture pattern's 60-second setup budget; the test body
timeout is unchanged. No production changes, wider cleanup, assertion filtering,
sleeps or retry-to-green.

Two consecutive focused runs pass without a database reset (one test each,
9.235 seconds and 9.432 seconds). Raw logs: `dss-d6-075-first.log` and
`dss-d6-075-second.log` in temporary storage. Full-gate acceptance is separate.

DEBT-015's full acceptance remains open. Its second invocation failed at Web
coverage before reaching this E2E suite. Focused verification is green, not a
claim of a new all-suite green result. No retry-to-green was attempted.

Subsequent full-gate checkpoint9350e85 passes all593 API E2E tests in55 suites
against the same disposable DB without reset, including this isolated fixture.
The wrapper later fails at an unrelated browser smoke (DEBT-077). This proves
the E2E correction in the full suite, not overall D6 acceptance.
