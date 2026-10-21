# Idempotent Consumers and Queue Recovery

Integration events are delivered with at-least-once semantics. A deterministic BullMQ job ID prevents duplicate enqueueing, while `processed_events` protects consumers from sequential redelivery.

Every consumer has a stable versioned name. It checks the `(eventId, consumerName)` marker before applying a side effect and records the marker only after successful handling.

Jobs use bounded exponential retry. Terminal failures are retained in BullMQ, copied to `dss.integration-events.dead-letter`, and persisted in `dead_letter_events` with the original envelope and failure reason. `QueueOperationsService` provides metrics, failed-job inspection, and explicit retry for the future Maintenance Center.

The delivery guarantee is at least once. Handlers must therefore remain idempotent at their own persistence boundary; external APIs should use the event ID as their idempotency key.
