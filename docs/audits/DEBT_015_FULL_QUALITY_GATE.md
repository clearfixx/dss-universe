# DEBT-015 — explicit full quality gate

## Approved scope

`pnpm quality:full` adds sequential fail-fast verification without changing the
shorter `pnpm quality`, application behavior or UI. Services and migrated test
databases must already exist. The runner never installs dependencies/browsers,
starts Docker, deploys migrations, resets databases or stops existing servers.

## Boundaries

- Before checks, require the loopback `dss_test` database/user on port 5434 or
  5435, with no URL query options, and loopback Redis on port 6380. This is an
  endpoint allowlist, not a claim that a database is disposable merely by name.
- Run formatting, architecture/licenses, Prisma validation/generation/read-only
  drift, lint/types, policy tests, dependency security, forced full coverage,
  API E2E, GraphQL consistency, build and compiled API entry checks in order.
- Keep a newly allocated report directory under `node_modules/.cache` for each
  invocation. Validate API E2E JSON: positive test/suite counts, all passed,
  no pending/todo/runtime errors. Missing or malformed reports fail the gate.
- Require free port 3100, then invoke Playwright with `CI=1`, no server reuse,
  retries disabled and two workers. Never terminate a foreign server. Playwright
  owns startup/cleanup of its server; an occupied port is a failure.
- A narrow environment allowlist excludes inherited API/database credentials
  from Web smoke. Next may still load its own local environment files; the
  runner does not rewrite those files or claim filesystem-level isolation.
- The Web reporter rejects empty, skipped, retried and expected-failure tests.
  Its successful report is required in addition to process exit status.
- Web smoke uses existing mocked browser flows; it does not prove a browser
  request reaches the real API/database. API E2E covers a separate boundary.
- A local run does not replace Linux/Windows containment CI or D7 acceptance.

## Verification status

Initial policy controls: 4/4 passed. Formatting, architecture, Prisma validation,
generation/drift, lint/types, existing policy controls and security passed.
Coverage passed: API 1298/1298, with all seven Turbo tasks fresh, none cached.

The first full invocation correctly failed at API E2E: 592/593 tests passed,
54/55 suites, no skipped/todo/runtime errors. The failing achievements fixture
expects one matching rule but leaves enabled rules from earlier invocations.
Read-only SQL confirms two enabled rules for `community.topic.published.v1`.
No database reset, assertion relaxation or retry was performed. Subsequent
GraphQL/build/Web steps were not reached and remain unverified for this gate.

The raw log is `dss-d6-quality-full-first.log` in local temporary storage;
JSON is in `node_modules/.cache/quality-full-2mjyuI/api-e2e.json`.
This is a failed wrapper, not a completed full gate. Fixture isolation requires
a separate correction; see `DEBT_075_ACHIEVEMENTS_FIXTURE_ISOLATION.md`.
