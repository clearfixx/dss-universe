# DSS Universe Web

The Next.js application owns the guest presentation, authenticated Command
Deck, Mission Control interfaces, and product-module user experiences.

## Architecture

- Next.js App Router and React Server Components by default;
- Apollo Client with generated GraphQL operations;
- GraphQL for product data and mutations;
- REST only for binary upload and delivery;
- TanStack Query/Table/Virtual for interactive server-state workflows;
- Zustand only for transient application-shell state;
- shadcn/Radix primitives with the DSS design tokens.

Authentication and authorization remain server-enforced. Server Components and
Server Actions read the HttpOnly session cookie and pass the bearer credential
to the API. UI visibility is never the only permission boundary.

## Delivered routes

- `/` — guest landing or authenticated Command Deck;
- `/command-deck` — personal DSS overview;
- `/profile/[username]` — privacy-aware social profile, Profile Wall and
  activity projection;
- `/settings/profile` — owner profile, privacy, notification, media, security
  and session settings;
- `/members` — searchable, filterable member directory with privacy-safe
  presence and TanStack Table;
- `/media` — Mission Control Media Library with storage metrics, catalog
  filters, cursor navigation, failure visibility, and processing retry.

The profile frontend uses React Server Components for GraphQL reads, Server
Actions for authenticated mutations, Zustand for transient profile-tab state,
and TanStack Table for the Members Directory. Reputation, points, levels,
titles and ranking remain owned by Phase 8; shared wall comments, reactions and
reports remain owned by Phase 9–10.

## GraphQL workflow

The API schema at `apps/api/src/schema.gql` is canonical. Operations live under
`src/graphql/operations`, and generated types/documents live under `src/gql`.

```bash
pnpm --filter @dss/web graphql:codegen
pnpm --filter @dss/web typecheck
pnpm --filter @dss/web test
pnpm --filter @dss/web build
```
