# Core Events and Transactional Outbox

## Purpose

Core Events defines versioned event envelopes and the durable write boundary used for cross-module and external side effects.

## Atomicity rule

`OutboxWriterService.append()` requires an existing Prisma `TransactionClient`. A feature must write its primary state and the matching outbox event in the same transaction.

```text
Application use case
  -> Prisma transaction
      -> write primary state
      -> append outbox event
  -> commit both or roll back both
```

Writing an outbox event through the root Prisma client is intentionally unsupported.

## Envelope

Every durable event has:

- unique event ID;
- stable name and positive schema version;
- category: domain, integration or system;
- producer;
- occurrence timestamp;
- JSON payload;
- optional aggregate, actor, correlation and causation context.

## Current boundary

This package persists pending events. Dispatching to BullMQ, locking, retries, dead-letter behavior and idempotent consumers belong to the next Phase 4 package.

🚀 Build. Share. Grow.
