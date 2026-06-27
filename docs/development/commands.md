# DSS Universe — Development Commands

## API

Run API in development mode:

pnpm api:dev

Build API:

pnpm api:build

Run API lint:

pnpm api:lint
Docker

Start local infrastructure:

pnpm db:up

Stop local infrastructure:

pnpm db:down

Restart local infrastructure:

pnpm db:restart

Show running containers:

pnpm db:ps

Show Docker logs:

pnpm db:logs

Open pgAdmin:

pnpm db:pgadmin
Prisma

Generate Prisma Client:

pnpm api:prisma:generate

Create and apply migration:

pnpm api:prisma:migrate

Open Prisma Studio:

pnpm api:prisma:studio

Run seed:

pnpm api:seed
