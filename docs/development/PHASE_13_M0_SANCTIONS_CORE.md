# Phase 13 M-0 — Sanctions core

Status: implementation package under review. Stacked on the Phase 13 brainstorm
(`phase/13-community-hub-brainstorm`); not an accepted baseline.

## Scope

M-0 extracts the minimum of Phase 14 that Community Hub needs before launch:
a private sanctions journal, verbal warnings with expiry, temporary read-only,
automatic escalation and centralized read-only enforcement. Bans, appeals,
public sanction annotations and Security Deck remain in Phase 14.

Included:

- new `moderation` owner module (`apps/api/src/modules/moderation`);
- `moderation_sanctions` journal and `moderation_sanction_policy` singleton;
- `WARNING` and `READ_ONLY` sanctions with `MANUAL`, `SCOPED` and `ESCALATION`
  origins;
- automatic escalation: N active warnings → read-only for D days, consuming
  those warnings;
- administrator-configurable policy values;
- private journal GraphQL for the subject and for staff;
- `SANCTION_ISSUER` contract for owner modules (Forum curators and scoped
  moderators in CH-4) and `SANCTION_STATE_READER` for enforcement;
- centralized write blocking for read-only subjects;
- Content Gates deny hidden content to read-only viewers (except authors).

Deferred:

- bans, permanent read-only, appeals, Security Deck — Phase 14;
- forum category/topic scopes — CH-0/CH-4 call `SANCTION_ISSUER` after their
  own scope checks;
- notification delivery for issued sanctions — Phase 15 (events are emitted);
- blocking binary downloads for read-only subjects — Phase 14/16 (GET routes
  are not intercepted).

## Data model

`moderation_sanctions` — one row per sanction, never deleted:

| Column                                     | Rule                                                    |
| ------------------------------------------ | ------------------------------------------------------- |
| `subjectId`                                | sanctioned user                                         |
| `kind`                                     | `WARNING` / `READ_ONLY`                                 |
| `origin`                                   | `MANUAL` / `SCOPED` / `ESCALATION`                      |
| `issuerId`                                 | required unless `ESCALATION`; never the subject         |
| `reason`                                   | 3–1000 characters (moderator comment)                   |
| `contextType`, `contextId`, `contextPath`  | optional link to the content; type and id together      |
| `issuedAt`, `expiresAt`                    | `expiresAt > issuedAt`; every M-0 sanction is temporary |
| `revokedAt`, `revokedById`, `revokeReason` | all or none                                             |
| `consumedAt`, `consumedBySanctionId`       | warnings consumed by an escalation; both or none        |

A sanction is **active** when not revoked and `expiresAt > now`. A warning
additionally counts towards escalation only while not consumed.

`moderation_sanction_policy` — single row `default`:

| Field                    | Default | Bounds |
| ------------------------ | ------- | ------ |
| `warningLifetimeDays`    | 30      | 1–365  |
| `escalationWarningCount` | 3       | 2–20   |
| `escalationReadOnlyDays` | 7       | 1–365  |
| `readOnlyMaxDays`        | 365     | 1–3650 |

## Rules

- Self-sanction is rejected.
- Sanctioning a subject who holds any sanction-issuing permission requires
  `moderation.sanctions.staff`.
- Warnings expire after `warningLifetimeDays`; read-only requires an explicit
  future expiry within `readOnlyMaxDays`.
- Issuing a warning locks the subject (transaction-scoped advisory lock),
  counts active unconsumed warnings and, at the threshold, inserts an
  `ESCALATION` read-only sanction and marks those warnings consumed in the same
  transaction.
- Revocation keeps history; revoking an escalated read-only does not restore
  consumed warnings.
- Every issue/revoke/policy change writes an audit record and an Outbox event
  (`moderation.sanction.issued.v1`, `moderation.sanction.revoked.v1`,
  `moderation.policy.updated.v1`).

## Visibility

- The subject sees their full journal: kind, origin, reason, context link,
  issued/expiry, revocation state. The issuer identity is not exposed to the
  subject.
- Staff with `moderation.sanctions.view` see any journal including issuer and
  revoker identifiers.
- Nothing is public. Public marks on content remain staff notes (CH-1) and the
  existing Interaction annotations.

## Enforcement

`ReadOnlyEnforcementInterceptor` (global) rejects, for an authenticated
subject with an active read-only sanction:

- every GraphQL mutation;
- every REST request other than `GET`, `HEAD` and `OPTIONS`.

Operations marked `@PermittedWhileReadOnly()` stay available: logout, session
revocation, password/email change, two-factor management, email verification,
privacy and notification preferences, block/unblock and account deactivation.
The interceptor reads state through the core `WRITE_RESTRICTION_READER`
contract bound by root composition, so Core does not import the feature.

Content Gates treat a read-only viewer as unable to unlock any gate, including
Premium bypass; content authors still see their own blocks.

## Permissions

| Key                           | Seeded roles     |
| ----------------------------- | ---------------- |
| `moderation.sanctions.view`   | moderator, admin |
| `moderation.warnings.issue`   | moderator, admin |
| `moderation.read-only.issue`  | moderator, admin |
| `moderation.sanctions.revoke` | moderator, admin |
| `moderation.sanctions.staff`  | admin            |
| `moderation.policy.manage`    | admin            |

The owner role receives every permission through the existing seed rule.

## Verification

- Prisma format/validate and zero schema drift;
- domain unit tests for expiry, escalation and validation;
- migrated-database e2e: constraints, escalation under concurrency,
  revocation, policy bounds, journal visibility;
- interceptor unit tests and Content Gate override tests;
- API lint, typecheck and architecture checks.

⚖️ A sanction without a record is a rumour; a record without an expiry is a grudge.
