# DSS Universe Events and Transactional Outbox

> Status: Phase 4 foundation implemented
>
> Updated: 2026-07-18

## Decision

Cross-module and external side effects use versioned integration events persisted in PostgreSQL through a transactional outbox. Publishing directly to Redis or BullMQ from a business transaction is prohibited because a database commit and a network publish cannot be atomic.

## Atomic write boundary

```text
Application use case
  -> Prisma transaction
      -> primary domain write
      -> OutboxWriterService.append(transaction, event)
  -> one commit
```

`OutboxWriterService` accepts only a Prisma `TransactionClient`. It intentionally cannot append through the root client. Integration tests prove both successful commit and forced rollback behavior.

## Event envelope v1

Required fields:

- `id`: globally unique event identity;
- `name`: stable past-tense event name, for example `iam.permission.created`;
- `version`: positive integer payload-schema version;
- `category`: `domain`, `integration` or `system`;
- `producer`: owning module or platform capability;
- `occurredAt`: ISO 8601 timestamp;
- `payload`: JSON-compatible data.

Optional context includes aggregate type/ID, actor ID, correlation ID, causation ID and JSON metadata.

Event names describe facts and must not encode transport names. Schema-breaking payload changes increment `version`; they do not silently reinterpret an existing version.

## Outbox lifecycle

The database supports these states:

```text
PENDING -> PROCESSING -> PUBLISHED
                    \-> FAILED
```

The first Phase 4 package implements atomic persistence and the schema required by the future dispatcher. Claiming/locking, BullMQ dispatch, retry policy, dead-letter operations and consumer idempotency are deliberately assigned to the next package.

## Migration boundary

The migration `20260718060000_add_transactional_outbox` creates only the outbox enum, table and indexes. It does not migrate the still-unreconciled Media WIP model.
