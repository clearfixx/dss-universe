# Core Queue

Owns BullMQ queues, the PostgreSQL outbox dispatcher, idempotency markers,
dead-letter persistence and operator recovery services. Jobs use deterministic
event IDs, bounded retries and exponential backoff.

## Responsibility

This directory contains application-wide infrastructure related to queue.

## Must contain

- infrastructure
- framework integrations
- technical services

## Must not contain

- business logic
- feature modules
- domain rules

This directory is intentionally created as part of the DSS Platform Foundation.
