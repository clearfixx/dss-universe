# Community Missions Module Passport 🎯

## Purpose

Staff-defined community challenges shown on the Community Hub ("Місії
спільноти"), each with the signed-in member's automatic progress.

## Owner decision (2026-11-22)

- Staff (`missions.manage`: moderator, admin, owner) create a mission:
  title, optional description, time window, a metric from a fixed list and
  a target.
- Metrics: `TOPICS`, `REPLIES`, `ACCEPTED_ANSWERS` (public forum sections
  only) and `REPUTATION` (net reputation received).
- Progress is counted automatically inside `[startsAt, min(now, endsAt))`.
- No rewards, sign-up or manual progress. Anything beyond this needs a new
  owner decision.

## Architecture

```text
MissionsResolver → MissionsService → Prisma (community_missions) + Audit + Outbox
                                   ↘ MISSION_METRIC_READER (consumer-owned port)
                                        ↳ composition/content-reads MissionMetricAdapter
                                             → FORUM_CONTRIBUTION_TOTALS, REPUTATION_TOTAL_READER
```

Writes emit `missions.mission.{created,updated,deleted}.v1`.

🚀 Build. Share. Grow.
