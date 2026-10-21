# Developer Onboarding

> This document describes how to prepare a local development environment for DSS Universe.

---

## Purpose

Developer onboarding should be predictable, repeatable, and boring in the best possible way.

A new developer should be able to clone the repository, run the setup steps, and start the project without guessing which environment variables, services, or commands are required.

---

## Requirements

Before starting, make sure the workstation has:

- Git
- GitHub CLI
- Node.js 24.18.0 (see `.node-version` and `.nvmrc`)
- pnpm 11.9.0 (managed through Corepack)
- Docker Desktop
- Visual Studio Code

On macOS, these tools can be installed using Homebrew.

---

## Repository

Clone the repository using SSH:

```bash
git clone git@github.com:clearfixx/dss-universe.git
cd dss-universe
```

Enable the pinned package manager and install exactly what the lockfile defines:

```bash
corepack enable
pnpm install --frozen-lockfile
```

---

## Environment Files

DSS Universe uses two local environment files.

### Root Environment

Used by Docker Compose.

```bash
cp .env.example .env
```

### API Environment

Used by NestJS, Prisma, and the API runtime.

```bash
cp apps/api/.env.example apps/api/.env
```

The database values in both files must stay synchronized.

If PostgreSQL credentials or ports change, update both files.

---

## Start Infrastructure

Start PostgreSQL, Redis, and pgAdmin:

```bash
docker compose up -d
```

Check containers:

```bash
docker compose ps
```

Expected services:

- dss_postgres
- dss_redis
- dss_pgadmin

---

## Database Setup

Generate Prisma Client:

```bash
pnpm db:generate
```

Run migrations:

```bash
pnpm api:db:migrate
```

Run seed:

```bash
pnpm api:db:seed
```

---

## Start Development

Run the development servers:

```bash
pnpm dev
```

Expected services:

- Web: http://localhost:3000
- API: http://localhost:3001

Health check:

```text
http://localhost:3001/api/health
```

Expected result:

```json
{
  "app": "DSS Universe API",
  "status": "ok",
  "database": {
    "status": "up"
  }
}
```

---

## Bootstrap Script

The project provides a helper script:

```bash
./scripts/bootstrap.sh
```

It prepares environment files, checks required tools, starts Docker services, generates Prisma Client, runs migrations, and seeds the database.

---

## Troubleshooting

Before opening a pull request, run:

```bash
pnpm quality
```

CI additionally runs coverage, the isolated API e2e test and the Web Playwright smoke test.

### Prisma cannot find DATABASE_URL

Make sure this file exists:

```text
apps/api/.env
```

### Docker Compose variables are empty

Make sure this file exists:

```text
.env
```

### PostgreSQL authentication failed

Reset local Docker volumes:

```bash
docker compose down -v
docker compose up -d
```

Then run migrations and seed again.

---

## Mission Status

When onboarding succeeds, the workstation is ready for DSS Universe development.

```text
🟢 ALL SYSTEMS NOMINAL
```

Welcome aboard, astronaut.

---

**Build for years, not for weeks.**
