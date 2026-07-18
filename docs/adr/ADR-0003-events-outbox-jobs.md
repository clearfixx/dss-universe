# ADR-0003 — Transactional Outbox and Durable Jobs

- Status: Accepted
- Date: 2026-07-18

## Context

Publishing content triggers indexing, notifications, points, analytics and feeds. Performing these operations synchronously or emitting an event before commit risks partial state and lost side effects.

## Decision

Persist integration events in a transactional outbox together with domain changes. A dispatcher submits durable BullMQ jobs through Redis. Consumers are idempotent and record retries/failures. Domain events may remain in-process inside a transaction; cross-module or external effects use outbox-backed integration events.

## Consequences

- user-facing transactions are independent of secondary services;
- eventual consistency is explicit;
- every consumer needs an idempotency strategy;
- operations need queue/dead-letter visibility in Maintenance Center;
- event schemas require names, versions, correlation and causation IDs.
