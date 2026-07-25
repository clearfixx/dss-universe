# DSS Universe Queues and Worker

> Status: Phase 4 foundation implemented
>
> Updated: 2026-07-25

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
- consumers persist stable `(eventId, consumerName)` markers;
- terminal failures are persisted and copied to a dead-letter queue;
- queue metrics, failed-job inspection and explicit retry are available through the platform service.

## Configuration

- `REDIS_HOST`, default `localhost`;
- `REDIS_PORT`, default `6379`;
- `OUTBOX_DISPATCH_INTERVAL_MS`, default `1000`; use `0` in tests or dedicated-dispatcher deployments.
- `DSS_UPLOADS_DIR`, default `uploads`;
- `CLAMAV_HOST`, default `localhost`;
- `CLAMAV_PORT`, default `3310`;
- `CLAMAV_TIMEOUT_MS`, default `15000`.

Every accepted Media upload is scanned asynchronously through ClamAV INSTREAM before transformation or permanent storage. The worker fails closed: detected malware and scanner outages transition the Media record to `QUARANTINED`; clean rescans can return it to `PROCESSING`. READY, REJECTED and DELETED jobs remain idempotent terminal outcomes.

Maintenance Center presentation and feature-specific handlers remain product work; the shared recovery contract is implemented.
