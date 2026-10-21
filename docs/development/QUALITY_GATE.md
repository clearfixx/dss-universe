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
- Web e2e tests use Playwright and an isolated Next.js server on port 3100.

## Coverage policy

Coverage is enforced on current critical service files rather than hidden by a low repository-wide percentage. Thresholds may only move upward as modules receive tests. New security-sensitive or business-critical services must add explicit thresholds with their first test suite.

## Local completion check

```bash
pnpm quality
```

Run the isolated e2e commands from `docs/development/commands.md` when changing API composition, persistence, routing or the Web application shell.

## Database safety

Automated tests must never use developer or production databases. The committed test defaults are non-secret and point only to the ephemeral `docker-compose.test.yml` service.
