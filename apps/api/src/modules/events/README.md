# Community Events Module Passport 📅

## Purpose

Staff-announced community events shown on the Community Hub ("Найближчі
події").

## Owner decision (2026-11-22)

- Staff (`events.manage`: moderator, admin, owner) create events with simple
  fields: title, optional description, start, duration, format (online or
  offline) and a link (online) or a place (offline).
- The public list shows events that have not finished yet, soonest first.
- No attendee registration, reminders or comments. Anything beyond this
  needs a new owner decision.

## Architecture

```text
CommunityEventsResolver → CommunityEventsService → Prisma (community_events) + Audit + Outbox
```

Writes emit `events.event.{created,updated,deleted}.v1`.

🚀 Build. Share. Grow.
