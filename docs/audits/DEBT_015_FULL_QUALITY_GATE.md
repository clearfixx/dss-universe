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

After the approved DEBT-075 correction passed twice in isolation, a second full
invocation stopped earlier at Web coverage: 57/60 tests passed, three exceeded
the existing 5000ms timeout. Affected cases: NewsPagination controls,
MembersDirectory presence/profile links, ProfileSettingsView completion/owner
controls/current session. See `dss-d6-quality-full-after075.log` in temporary
storage. This run did not reach API E2E, GraphQL, build or browser smoke.

The root cause of these timeouts is not established. A later memory snapshot
does not prove resource pressure during failure. No timeouts, assertions or UI
were changed; no third blind full rerun was attempted. DEBT-076 tracks diagnosis.
The runner remains locally implemented, with full acceptance open.

After the approved DEBT-076 worker bound, checkpoint9350e85 passes every step
through API entry validation. Coverage: API1298, Web60, Worker50, Storage43,
all passing; seven fresh Turbo tasks. API E2E593/593 in55 suites,754.824 seconds,
zero skipped/todo/runtime errors. GraphQL consistency and build pass. The final
fresh Web smoke fails12/13 on arrival pause/resume readiness (DEBT-077), and the
reporter and wrapper correctly fail. No retry was performed. The owned Web
server no longer listens on3100 after Playwright teardown.

Evidence: `dss-d6-quality-full-after076.log` in temporary storage and
`node_modules/.cache/quality-full-eS98bn/{api-e2e,web-smoke}.json`.
This is still a failed full wrapper; partial green steps do not accept D6.

The separately approved DEBT-077 test-only correction subsequently passes fresh
Web smoke14/14 with strict reporter, no retries/skips or server reuse. All
individual boundaries now have passing evidence, but this does not turn the
earlier failed wrapper into a green one. A consolidated full-gate run of the
final source remains required before push/phase acceptance.

The next consolidated attempt stops at formatting of Next-generated
`apps/web/next-env.d.ts` (CRLF), tracked separately as DEBT-078. The exact-path
generated-file ignore correction passes root formatting and five policy
controls without rewriting generated output. The final wrapper must still run;
none of these partial verifications is advertised as full success.
