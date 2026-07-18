# DSS Universe — Development Commands

Run commands from the repository root.

## Daily development

```bash
pnpm dev
pnpm api:dev
pnpm build
```

## Quality gate

```bash
pnpm lint
pnpm typecheck
pnpm db:validate
pnpm test
pnpm test:cov
pnpm architecture:check
pnpm quality
```

Use `pnpm lint:fix` only when an automatic rewrite is intentional.

## End-to-end tests

API tests require the isolated test database:

```bash
docker compose -f docker-compose.test.yml up -d --wait
DATABASE_URL=postgresql://dss_test:dss_test@127.0.0.1:5433/dss_test pnpm --filter @dss/api db:deploy
pnpm --filter @dss/api test:e2e
docker compose -f docker-compose.test.yml down
```

Web browser tests start their own server on port 3100:

```bash
pnpm --filter @dss/web exec playwright install chromium
pnpm --filter @dss/web test:e2e
```

## Local infrastructure

```bash
pnpm db:up
pnpm db:ps
pnpm db:logs
pnpm db:down
```

## Prisma

```bash
pnpm db:generate
pnpm api:db:migrate
pnpm api:db:deploy
pnpm api:db:seed
pnpm api:db:studio
```

Never point automated tests at a development or production database.
