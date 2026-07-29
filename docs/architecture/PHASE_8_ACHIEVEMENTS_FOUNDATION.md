# Phase 8 — Achievements Foundation

## Status

Implemented as the fifth Phase 8 package.

## Boundary

Achievements converts explicit semantic eligibility events into auditable
profile badges.

```text
Owning domain
  → versioned semantic event
  → matching Achievement Rule
  → policy checks
  → immutable Achievement Award
```

The module does not inspect Community Hub, Academy, Research Lab, News, or
other feature tables. Each owning domain decides when its milestone happened
and publishes a versioned event.

Achievements are distinct from:

- Community Points, which explain participation score;
- Levels, which project Community Points thresholds;
- Custom Titles, which provide user-selected presentation awards;
- roles, groups, permissions, and content entitlements.

## Definitions

An administrator-managed definition contains:

- stable machine key;
- Unicode-compatible name and slug;
- description;
- six-digit hex color;
- badge key or short badge value;
- active/archive lifecycle.

Archived definitions remain attached to historical awards. Their rules stop
matching because event consumption requires an active definition.

## Rules

Each rule defines:

- exact versioned event name;
- top-level payload key containing the recipient user ID;
- repeatable or non-repeatable behavior;
- cooldown in hours from `0..87600`;
- optional UTC daily cap from `1..1000`;
- enabled state.

The same achievement cannot have duplicate rules for the same event. Multiple
different achievements may listen to one event.

### Non-repeatable

After one active award, later matching events are marked processed and ignored.
A revoked award permits a future event to earn the achievement again.

### Repeatable

Every qualifying event may create another active award, subject to cooldown and
daily cap. Revoked awards do not consume the active daily cap.

## Idempotency and concurrency

- the consumer coordinate is `(eventId, dss.api.achievements:<ruleId>)`;
- each rule processes a delivery at most once;
- per-user/per-achievement advisory transaction locks serialize concurrent
  events and manual awards;
- source-event uniqueness protects the same definition from duplicate evidence;
- ignored and capped deliveries still receive processed-event markers.

## Manual awards

Administrators may award an active achievement with a mandatory reason.
Manual awards use the same immutable history and conflict protection as
event-based awards.

## Moderation rollback

Every event-based award may retain `sourceType` and `sourceId`.

Moderation may revoke:

- one award explicitly;
- every active award associated with a source;
- awards automatically when an integration event contains
  `reversedSourceType` and `reversedSourceId`.

Rollback appends `AchievementAwardRevocation`. It never edits or deletes the
original award. PostgreSQL triggers reject updates and deletes for both awards
and revocations.

## Evidence

Definitions, rules, awards, and revocations commit with:

- immutable Audit records;
- versioned `achievements.*.v1` Outbox events;
- correct aggregate type and identifier;
- user or system actor identity.

## Authorization

`achievements.manage` is seeded for administrator and owner roles. Runtime
guards check the permission, not role names.

Achievement definitions and awards contain no permission, role, group, or
entitlement relation.

## GraphQL

Authenticated profile contracts:

- active definition discovery;
- active awards for a user.

Permission-backed administration:

- full definition and rule discovery;
- create/update/archive definitions;
- create/update/disable rules;
- manual awards;
- explicit and source-based revocation;
- full user award history including revocations.

## Verification

Coverage includes:

- Unicode definition normalization;
- rule validation;
- multiple matching rules;
- missing recipient rejection;
- concurrent duplicate delivery;
- non-repeatable active award behavior;
- repeatable UTC daily caps;
- cap recovery after moderation rollback;
- manual award and revocation;
- source-aware rollback;
- GraphQL permissions and contracts;
- Audit and Outbox evidence;
- PostgreSQL immutability;
- clean application of the complete migration chain.

## Next boundary

Leaderboards will read Community Points and other approved projections without
inventing an opaque composite score.

> Achievements remember milestones. Authorization still guards the doors.
