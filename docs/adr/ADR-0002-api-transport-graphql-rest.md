# ADR-0002 — GraphQL/Apollo with Purposeful REST

- Status: Accepted
- Date: 2026-07-18

## Context

GraphQL/Apollo was approved at project inception but early implementation exposed only REST. DSS Universe needs composable product reads without duplicating business logic or forcing file transport through GraphQL.

## Decision

Adopt Apollo Server with NestJS and Apollo Client in Web. Product reads/mutations default to GraphQL. REST remains for health, file transfer, signed upload flows, webhooks, OAuth callbacks, streaming and exports. Both transports invoke the same application services.

GraphQL Code Generator creates typed client operations. DataLoader is request-scoped. Query pagination, depth and cost are bounded.

## Consequences

- GraphQL is added as an interface, not a second application architecture;
- existing REST endpoints can migrate incrementally;
- domain/application layers remain transport-agnostic;
- GraphQL DTOs/types do not replace domain entities;
- schema and generated-client compatibility become CI gates.
