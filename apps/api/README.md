# DSS Universe • API

NestJS backend API for DSS Universe.

This application provides the server-side foundation for authentication, authorization, users, platform modules, and future DSS services.

---

## Status

Active development.

Current focus:

- platform architecture foundation;
- core/shared/module separation;
- users reference module;
- role and permission system;
- backend engineering standards.

---

## Tech Stack

- NestJS
- TypeScript
- Prisma
- PostgreSQL
- JWT authentication
- Role-based and permission-based authorization

---

## Source Structure

```txt
src/

core/
  auth/
  authorization/
  config/
  database/
  security/
  logger/
  cache/
  mail/
  queue/
  events/
  scheduler/

shared/
  domain/
  application/

modules/
  users/

health/
Core

core contains application-wide infrastructure.

Examples:

authentication infrastructure;
authorization engine;
configuration;
database infrastructure;
security tools;
logging;
cache;
mail;
queues;
events;
scheduler.

Core must not contain feature-specific business logic.

Shared

shared contains reusable, business-neutral building blocks.

Examples:

base repository contracts;
pagination types;
shared domain primitives;
reusable application helpers.

Shared must not depend on feature modules.

Modules

modules contains DSS business features.

Current module:

modules/users

Future modules may include:

forum;
blog;
academy;
CMS;
messages;
support;
downloads.
Development

Run the API in development mode:

pnpm --filter @dss/api start:dev

Build the API:

pnpm --filter @dss/api build

Run Prisma commands:

pnpm --filter @dss/api prisma
Architecture Rules

This API follows DSS Universe architecture documents:

docs/architecture/CORE_ARCHITECTURE.md
docs/architecture/ARCHITECTURE_RULES.md
docs/engineering/MODULE_GUIDELINES.md
docs/engineering/IMPORT_RULES.md
docs/development/DEVELOPMENT_WORKFLOW.md
Final Rule

This API is not just a NestJS application.

It is the backend platform foundation of DSS Universe.
```
