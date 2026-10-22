# DEBT-073 — Explicit full API test environment

Date: 2026-10-22. Branch: `debt/d6-quality-baseline`, based on accepted
mainfcab53c (D5 PR#78). Status: local gates passed; remote CI/review open.

## Problem and scope

D5's plain `pnpm quality` exited0 but API reported1175 passed/106 skipped.
Turbo strict env omitted four opt-ins supplied by the invoking shell. Owner
approved a separate D6 correction. No application runtime, UI, schema, test
assertion, dependency or timeout changes are included.

## Correction

- API-specific test/unit/coverage tasks hash and forward explicit DB/Redis env,
  four opt-ins and a full-profile marker. These are not exposed to Web tasks.
- Overrides preserve upstream builds and outputs. An initial actual dry-run
  showed that package-specific tasks do not inherit those generic fields; this
  was corrected and regression-tested, not assumed safe.
- The result-policy file outside API is included in task inputs alongside
  `$TURBO_DEFAULT$`; policy edits invalidate the corresponding API hash.
- `pnpm test:full [--coverage]` requires a loopback `dss_test` endpoint, enables
  all opt-ins, uses strict env and forces fresh execution. Endpoint hashing alone
  cannot account for changing database contents, so full acceptance must not
  restore a prior successful test result.
- Jest rejects incomplete, failed, empty or skipped/todo full-profile results
  and missing opt-ins. Normal developer partial runs remain available.
- Root quality and CI coverage invoke this profile and its policy tests. The
  runner provisions no service and applies no migration.

## Evidence so far

27 pure policy/config tests, four real Turbo hash tests and two actual Jest
controls pass. Each of ten env keys changes each API task hash; unchanged env
is stable; dependencies/policy input persist and Web remains isolated. Real
Jest accepts complete passing no-IO fixtures and exits1 for a skipped control.
Only validated temporary fixture directories are created/removed.

First full-profile execution: natural exit0, API1281/1281 in170 suites, zero
skipped,108.778s; eight workspace tasks succeed with zero cached. This precedes
the final policy-input/hash-test addition; final quality and coverage follow.

The subsequent quality run exited0: all33 policy controls passed, API1281/1281
in170 suites with no skips, workspace tests executed without cached results,
build succeeded and architecture reported140/140 checks with no findings.
Security policy9/9 and the accepted braces patch regressions14/14 passed;
generated GraphQL consistency passed without an SDL change.

The first fresh5435 coverage-to-E2E pipeline failed during coverage. API hooks
and two Web tests exceeded their existing5000ms deadlines while the coverage
tasks ran concurrently. E2E was deliberately not started. The failed log is
retained as `dss-d6-pipeline-coverage.log` in the local temporary log directory.
Resource oversubscription is a hypothesis, not a proven application defect.

The bounded correction serializes full-profile Turbo tasks and aligns API
coverage with the existing serial unit-test mode (`--runInBand`). Assertions,
timeouts and explicitly orchestrated concurrency scenarios are unchanged.
Quality and fresh coverage followed by E2E on the same disposable database
were required again after this correction; results follow below.

A subsequent aggregate quality attempt was stopped during lint after Windows
failed to start a diagnostic PowerShell with `System.OutOfMemoryException`.
This is additional DEBT-035 resource evidence, not a completed quality gate.
No owner dev process was stopped. After the owned verification process exited,
resource inspection showed available memory and no remaining D6 Node workers;
the33 policy controls passed again. Fresh sequential coverage is being verified
before starting E2E, rather than overlapping heavy verification commands.

The corrected fresh5435 coverage run then exited0 in2m15.025s: API1281/1281
in170 suites, Web60/60, Storage43/43 and Worker46/46; seven tasks succeeded
with zero cached results. No test deadline or assertion changed. The failure
did not reproduce with the bounded execution policy; this is evidence for
resource-sensitive execution, not proof that every possible timeout is fixed.
Full API E2E then naturally exited0 against that same database without an
intervening reset:586/586 tests in53 suites, zero failed/pending/todo/runtime
errors. Its JSON output directory was allocated before execution. Afterwards
the database had zero remaining clients and zero private schemas; the full SDL
SHA256 remained `C03170CB54027C557F662A5B9BF5F85CAFA2112B8623D3FCA360E8FA9C82FD2C`.

The final aggregate `pnpm quality` naturally exited0 after the correction:
format, lint, typecheck, Prisma validation,33 policy controls, API1281/1281
in170 suites with no skips, eight fresh workspace test tasks, build and140/140
architecture tests with zero findings. Final security policy/patch verification
and GraphQL consistency also exited0. The exact previously owner-approved
braces advisory exception remains open; no new exception is introduced.

Local evidence logs: `dss-d6-resumed-policy.log`, `dss-d6-bounded-migrations.log`,
`dss-d6-bounded-coverage.log`, `dss-d6-bounded-e2e.log`,
`dss-d6-resumed-quality.log`, `dss-d6-resumed-security.log` and
`dss-d6-resumed-graphql.log` in the local temporary log directory. Full E2E JSON
is retained in this worktree's ignored `node_modules/.cache/d6-bounded-e2e.json`.
These are local evidence, not yet a clean remote CI acceptance or a fresh
browser-to-database verification. No frontend source changed in this package.

Remote CI/review and remaining D6 packages are open. No other D6 debt or
Phase11 readiness is declared complete.

References: [Turbo environment variables](https://turborepo.dev/docs/crafting-your-repository/using-environment-variables)
and [task configuration](https://turborepo.dev/docs/reference/configuration).
