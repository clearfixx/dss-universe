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

## Proposed separate scope — approval pending

Isolate this fixture's database state using the existing migrated private-schema
test pattern, retain exact award/idempotency/cap/rollback assertions, then verify
two consecutive runs without a database reset. No production changes, wider
cleanup, assertion filtering/weakening, sleeps or increased timeouts.

DEBT-015's full acceptance remains open. Its runner correctly stopped before
GraphQL, build and Web smoke; no retry-to-green was attempted.
