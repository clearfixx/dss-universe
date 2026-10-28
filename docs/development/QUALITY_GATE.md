# DSS Universe Quality Gate

## Purpose

Every change must prove that it preserves repository architecture, schema validity, type safety, tested behavior and production builds.

## Pull request gate

GitHub Actions runs three independent jobs:

1. **Quality** — frozen install, architecture boundaries, Prisma validation and generation, migrations, lint, typecheck, unit coverage, API e2e and production build.
2. **Web smoke** — Chromium installation and Playwright verification of the guest application shell.
3. **Security** — dependency audit that fails for high or critical advisories.

Dependabot checks npm and GitHub Actions dependencies weekly.

## Test layers

- API unit tests cover critical Auth, IAM safety and Users contracts.
- API e2e tests boot the real Nest application against an isolated PostgreSQL database on port 5433.
- Web component tests use Vitest, jsdom and Testing Library.
- Web e2e tests use Playwright and an isolated loopback Next.js server on port 3100 by default; `DSS_WEB_TEST_PORT` explicitly selects another validated port.

## Coverage policy

Coverage is enforced on current critical service files rather than hidden by a low repository-wide percentage. Thresholds may only move upward as modules receive tests. New security-sensitive or business-critical services must add explicit thresholds with their first test suite.

## Local completion check

```bash
pnpm quality
```

Run the isolated e2e commands from `docs/development/commands.md` when changing API composition, persistence, routing or the Web application shell.

## Full local gate and reserved ports

`pnpm quality:full` requires the prepared disposable PostgreSQL endpoint on
5434/5435 and loopback test Redis6380. It never resets a database or provisions
services. It checks the Web port before the gate and again before fresh browser
startup, without stopping or reusing another server.

If Windows reserves3100 or another service owns it, choose a verified available
loopback port explicitly rather than changing Windows reservations or services:

```powershell
$env:DSS_WEB_TEST_PORT = '3195'
pnpm quality:full
```

The override must be canonical decimal1024–65535; malformed or empty values fail
closed. The runner, sanitized browser environment, Playwright baseURL and its
server command share one resolver. There is no automatic fallback, new host,
timeout increase or retry. The normal application dev/production ports do not
change. Preflight reports EACCES separately from EADDRINUSE.

The full gate includes dependency security, forced full-profile coverage,
no-skipped API E2E, GraphQL consistency, production build/entry and fresh
zero-retry Web smoke. It stops at the first failed step; later steps must be
reported as not executed, not passed. `pnpm quality` is the shorter gate,
not equivalent coverage.

## Database safety

Automated tests must never use developer or production databases. The committed test defaults are non-secret and point only to the ephemeral `docker-compose.test.yml` service.
The CI job's PostgreSQL5433 is an isolated Actions service; this does not authorize
local tests against the developer database on5433. Local full-gate policy accepts
only disposable5434/5435.
