# Local environment — D0

## Ownership and ports

| Configuration                            | Consumer                      | Local endpoints                                    |
| ---------------------------------------- | ----------------------------- | -------------------------------------------------- |
| Root `.env`                              | Docker Compose                | PostgreSQL 5433, Redis 6379, pgAdmin 5050          |
| `apps/api/.env`, optionally `.env.local` | Nest configuration and Prisma | API 3001, prefix `/api`                            |
| `apps/worker/.env`                       | Node environment loader       | Same database/Redis as API, SMTP 1025, ClamAV 3310 |
| `apps/web/.env`                          | Next.js                       | Web 3000, API/GraphQL 3001                         |
| `docker-compose.test.yml`                | Disposable test services      | PostgreSQL 5434, Redis 6380                        |

Root application variables in the legacy example do not configure application
processes. API and Worker need their own environment files. Never commit local
environment files or copy secrets into `NEXT_PUBLIC_*` variables.

API media paths default to `apps/api/uploads`. Worker's example uses
`DSS_UPLOADS_DIR=../api/uploads`, resolved from `apps/worker`. Change both sides
together if moving the local storage directory.

## Bootstrap

Use exactly Node **24.18.0** and pnpm **11.9.0**, not an unspecified latest release.
Start Docker Desktop, then run from the repository root:

```powershell
node scripts/bootstrap.mjs
corepack pnpm dev
```

`scripts/bootstrap.sh` delegates to the same Node script on Bash-based systems.
Windows execution was verified; macOS/Linux execution is not yet verified.

Bootstrap checks runtime versions and Docker, creates only missing `.env` files,
generates local signing/encryption secrets for new files, installs the frozen
lockfile, waits for infrastructure, applies committed migrations and runs seed.
New API/Worker files inherit Compose database credentials and Redis port.
Before migration/seed it rejects database/Redis endpoint mismatches, including
external process overrides. It never resets a database or creates a migration.

Existing `.env` files are preserved. Review their example for missing keys and
keep API/Worker database and mail-link settings aligned. Do not regenerate a
2FA encryption key when encrypted 2FA records already exist. Node's Worker
loader does not read `.env.local`; API configuration does.

The seed creates known development accounts. These services and credentials
are for a local disposable environment, never a production deployment.

## Required infrastructure

Compose publishes services on loopback only. Mailpit catches SMTP on 1025 and
has a mailbox UI at `http://localhost:8025`. ClamAV listens on 3310 and preserves
signature databases in its named volume. First startup may take several minutes.
PostgreSQL, Redis, Mailpit and ClamAV have healthchecks; pgAdmin does not.

```powershell
docker compose ps
Invoke-RestMethod http://localhost:3001/api/health/ready
docker compose -p dss-test -f docker-compose.test.yml up -d --wait
```

The test database uses tmpfs and is disposable. Its URL is
`postgresql://dss_test:dss_test@localhost:5434/dss_test?schema=public`.
Set this URL explicitly for test migrations and database-backed tests; do not
point them at the development database. CI's separately defined service ports
are not changed by this local Compose topology.

## Optional observability

Owner approved an opt-in profile. It provides an OTLP/HTTP collector, not a
persistent monitoring backend or dashboard:

```powershell
docker compose --profile observability up -d otel-collector
$env:OTEL_EXPORTER_OTLP_ENDPOINT = 'http://localhost:4318'
$env:OTEL_EXPORTER_OTLP_PROTOCOL = 'http/protobuf'
corepack pnpm dev
```

Set OTEL variables in the process environment **before** starting API:
instrumentation loads before Nest reads API environment files. With no explicit
trace exporter/endpoint, instrumentation does not start. `OTEL_SDK_DISABLED=true`
disables it even when an endpoint is configured.

Collector debug output uses basic verbosity and synthetic smoke data only.
Do not enable detailed telemetry dumps containing user data or credentials.
This setup follows the official [Collector Docker configuration](https://opentelemetry.io/docs/collector/install/docker/).

## Storage decision

Owner approved LOCAL storage for D0. MinIO/S3 is not operational and is not
claimed as implemented. Adapter/provider ownership remains tracked by
`DEBT-017`; adding a container alone would not implement application support.

## GitHub and completion gate

GitHub CLI is installed and authenticated separately from browser sign-in.
`gh auth status`, repository PR inspection and Actions run listing were verified.
Never publish auth tokens or local environment files in diagnostic reports.

D0 remains unmergeable while the repository-wide tests/format gate is red.
Known storage-security, Sharp cleanup and formatting debt is recorded in the
[verification report](../audits/D0_ENVIRONMENT_PROGRESS_2026-10-10.md).
No Phase 11 work starts before the agreed debt closure and brainstorm.
