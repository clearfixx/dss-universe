# DSS Universe GraphQL API

> Status: Implemented foundation
>
> Phase: 3 — API, GraphQL and Application Shell Foundation
>
> Updated: 2026-07-18

## Transport boundary

GraphQL and Apollo are the primary product API. REST remains intentional for media upload/download streams, health checks, webhooks and operational endpoints.

```text
Next.js / Apollo Client
          ↓
     GraphQL resolver
          ↓
   Application service
          ↓
 Repository contract
          ↓
       Database
```

REST controllers follow the same path from presentation to application services. GraphQL does not create a second business layer.

## Implemented vertical slice

- generated code-first schema at `apps/api/src/schema.gql`;
- authenticated `viewer` query;
- public user lookup queries;
- permission-protected users list with bounded pagination;
- register, login, refresh and logout mutations;
- request-scoped Users DataLoader;
- stable public error codes;
- depth and complexity protection;
- production introspection policy;
- typed Web operations generated from the canonical schema.

## Frontend state ownership

| State                                         | Owner                    |
| --------------------------------------------- | ------------------------ |
| GraphQL entities and product queries          | Apollo Client            |
| REST, media transfer and operational requests | TanStack Query           |
| tables and large virtualized lists            | TanStack Table / Virtual |
| shell, drawers and transient UI state         | Zustand                  |
| form state and validation                     | React Hook Form / Zod    |

Duplicating the same server entity in Apollo and TanStack Query is prohibited.

## Schema conventions

- presentation models are separate from Prisma and domain records;
- owner-only fields use a dedicated viewer model;
- list arguments use bounded input objects;
- IDs use GraphQL `ID`;
- dates are ISO 8601 strings until the date scalar is approved;
- input validation uses class-validator at the transport boundary;
- generated Web operation files are never edited by hand.

## Verification

CI generates Prisma, boots the API against PostgreSQL, runs schema and Auth/Users end-to-end tests, checks generated Web operations, and builds both applications.
