# Core GraphQL

## Purpose

This directory owns the shared Apollo transport for DSS Universe product APIs. Feature modules own their resolvers, inputs and public models; Core GraphQL owns only transport-wide policy.

## Platform rules

- GraphQL is used for product queries and mutations.
- REST remains the correct transport for health, media streams, webhooks and operational endpoints.
- Resolvers and REST controllers call the same application services.
- Domain and repository layers do not depend on GraphQL.
- Public models never expose password, token hash or internal persistence fields.
- Every list uses a bounded pagination input; the current global maximum is 100 items.
- Dates are serialized as ISO 8601 strings until a platform date scalar is approved.
- Request-scoped DataLoaders batch relation lookups; they are not application caches.

## Request protection

Operations are limited to depth 10 and complexity 250. Production disables schema introspection and GraphiQL. Public errors use stable codes and redact unexpected internal details.

## Cache ownership

Apollo owns normalized GraphQL entity state. TanStack Query owns REST, media-transfer and operational state. The same entity must not be stored in both caches.

🚀 Build. Share. Grow.
