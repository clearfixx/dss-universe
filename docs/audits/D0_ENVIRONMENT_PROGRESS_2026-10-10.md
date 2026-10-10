# D0 environment verification — 2026-10-10

Status: implementation verified; acceptance blocked by existing repository-wide
test/format failures. Draft review only; not approved for merge or Phase 11.

Branch: `debt/d0-environment`.

## Verified

- Bootstrap completed with Node 24.18.0 and pnpm 11.9.0.
- Existing local environment files were preserved; missing Worker and Web
  environment files were created from tracked examples.
- PostgreSQL, Redis, Mailpit and ClamAV passed container healthchecks.
  pgAdmin is running but has no application healthcheck.
- SMTP transport verification succeeded against localhost:1025.
- ClamAV answered `PONG` on localhost:3310. This proves protocol availability,
  not yet a complete infected-upload rejection flow.
- Prisma found 52 committed migrations, with none pending; seed succeeded.
- Worker environment validation: five tests passed; Worker typecheck passed.
- Repository lint, typecheck, Prisma validation, architecture checks and
  production build all passed.
- Isolated test PostgreSQL (5434) and Redis (6380) passed healthchecks while dev
  services remained running; all 52 migrations applied to the test database.
- Independent Web test run passed: 25 files, 59 tests.
- Five telemetry-startup tests passed: no implicit exporter, explicit OTLP,
  explicit console export, no implicit OTLP endpoint and explicit SDK disable.
- API readiness returned HTTP 200 with database, Redis, queues and Worker up.
- Browser dev login succeeded and reached the home page with GraphQL API `ok`.
- Real synthetic SMTP delivery was accepted. ClamAV INSTREAM returned `OK` for
  clean content and `Eicar-Test-Signature FOUND` for the standard EICAR test.
  No EICAR file was written to the host filesystem.
- Optional collector accepted a synthetic OTLP trace with HTTP 200; collector
  logs also confirmed API trace reception before opt-in startup was enforced.
- Owner approved Mailpit, optional observability and deferral of S3/MinIO
  application support to DEBT-017.
- GitHub CLI 2.102.0 installed; authenticated as `clearfixx`. PR, Actions and
  Issues read access verified. Audit PR #1 remains open; its CI is red.
- Existing API environment received missing keys without replacing existing
  values. A random missing 2FA key was added only after confirming zero 2FA
  records in the local database. Local environment files remain untracked.
- Bootstrap repeated successfully with a frozen lockfile and preserved env
  files. A deliberately mismatched database URL was rejected before migration
  or seed. Windows execution no longer concatenates subprocess arguments
  through a shell.

## Gate failures reproduced

- Worker suite: 25 tests passed, three failed. Two failures concern storage-root
  containment on Windows; one is an image-file cleanup `EBUSY` failure.
  These belong to the planned D0.6 storage-security package. They are not waived.
- The root test command stopped after Worker failed. API and Web results must
  not be inferred from this run.
- Independent API run: 70 suites passed, one failed, one skipped; 289 tests
  passed, one failed, three skipped. The failing LocalStorageProvider test
  confirms Windows path traversal: an outside-root path was accepted.
  This reinforces D0.6's security priority.
- Repository formatting check reports 50 files. No broad automatic rewrite was
  performed; frontend and documentation cleanup remain separately scoped.

## Still required before acceptance

- Owner review of the stacked draft package PR, based on the audit branch.
- Close the planned storage-security/Sharp and formatting debts, then rerun the
  complete quality gate. No failing check has been waived.
- Reproduce the final CI gate after the baseline fixes and review dependencies
  in D0.5. D0 has not attempted those separate packages.

See [local environment instructions](../development/D0_LOCAL_ENVIRONMENT.md).

No merge or Phase 11 implementation is authorized by this progress report.
