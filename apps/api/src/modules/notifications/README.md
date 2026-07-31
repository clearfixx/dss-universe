# Notifications Module Passport 🔔

## Purpose

The Notifications module owns notification policy and, in Phase 15, delivery
orchestration for DSS Universe.

Phase 7 establishes the owner-controlled preferences boundary without
prematurely implementing notification inboxes, email transport or realtime
delivery.

Phase 9 adds the first producer integration: Comments emits durable
`notifications.mention.created.v1` and `notifications.mention.retracted.v1`
signals. Delivery remains deferred to a Notifications consumer so user
preferences, grouping and retry policy stay centralized.

## Current responsibility

- stable preferences before the first persisted update;
- configurable in-app categories;
- configurable email categories and master email switch;
- digest cadence;
- owner-only GraphQL query and mutation;
- immutable preference-change audit.

Mandatory security notifications are not configurable and must bypass these
preferences. This prevents account-security events from being accidentally
silenced.

## Architecture

```text
GraphQL Resolver
      ↓
NotificationPreferencesService
      ↓
NotificationPreferencesRepository
      ↓
Prisma + Audit
```

## Future Phase 15 boundary

This module will later own:

- notification inbox and unread state;
- grouping and deduplication;
- mention and domain-event consumers;
- email fallback policy;
- queued delivery and delivery audit;
- realtime transport where justified.

Feature modules emit domain events. They must not send notification emails or
write notification inbox rows directly.

## Notes

Preferences decide how ordinary signals travel. Security warnings always reach
the astronaut.

🚀 Build. Share. Grow.
