# Achievements Module Passport 🏅

## Purpose

Achievements recognizes auditable user milestones through semantic platform
events or explained manual awards.

It owns profile badges and award history. It does not own Community Points,
levels, custom display titles, roles, groups, or permissions.

## Event boundary

Owning modules emit semantic eligibility events:

```text
Community Hub / Academy / Research Lab / future module
  → semantic integration event
  → Achievement Rule
  → immutable award
```

Achievements never queries another feature module’s tables to guess whether a
milestone happened.

## Ownership

- active and archived achievement definitions;
- event-name and recipient-payload-key rules;
- repeatable or non-repeatable policy;
- cooldown in hours;
- optional UTC daily award cap;
- manual awards with mandatory reasons;
- immutable award and revocation history;
- source-aware moderation rollback;
- idempotent per-rule event processing;
- Audit and Outbox evidence.

## Invariants

- definitions and rules may be disabled without deleting history;
- non-repeatable rules do not create a second active award;
- repeatable rules respect cooldown and daily cap;
- a repeated event cannot duplicate an award;
- revocation is a compensating record, never an update to award history;
- source rollback only affects awards tied to that source;
- revoked awards do not consume an active daily cap;
- achievements never grant permissions.

## Permission

`achievements.manage` controls definitions, rules, manual awards, explicit
revocations, source rollback, and administrative history.

Authenticated users may discover active definitions and view active profile
awards.

## GraphQL

Queries:

- `achievements`;
- `achievementsAdmin`;
- `achievementRules`;
- `userAchievements(userId)`;
- `userAchievementHistory(userId)`.

Mutations:

- `saveAchievement(input)`;
- `saveAchievementRule(input)`;
- `awardAchievement(input)`;
- `revokeAchievementAward(input)`;
- `rollbackAchievementSource(input)`.

> The badge celebrates the mission. The event ledger keeps the flight recorder.
