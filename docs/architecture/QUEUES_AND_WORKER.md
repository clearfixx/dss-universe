# DSS Universe Queues and Worker

> Status: Phase 4 foundation implemented
>
> Updated: 2026-07-18

## Runtime boundary

The API commits business data and outbox events, then dispatches pending events to BullMQ. `apps/worker` is a separately deployable process. Shared queue names, job names and payload contracts live in `@dss/jobs`.

```text
PostgreSQL outbox -> API dispatcher -> Redis / BullMQ -> apps/worker
```

## Delivery guarantees

- rows are claimed through a conditional `PENDING -> PROCESSING` update;
- the BullMQ job ID equals the immutable event ID;
- a retry after a crash cannot create a second retained job with that ID;
- successful enqueue marks the outbox row `PUBLISHED`;
- enqueue failure records the error and returns the row to `PENDING`;
- stale processing locks are recovered automatically;
- jobs use five attempts, exponential backoff and retained results.

## Configuration

- `REDIS_HOST`, default `localhost`;
- `REDIS_PORT`, default `6379`;
- `OUTBOX_DISPATCH_INTERVAL_MS`, default `1000`; use `0` in tests or dedicated-dispatcher deployments.

Feature-specific consumers, dead-letter operations and Maintenance Center monitoring remain subsequent Phase 4 work.
