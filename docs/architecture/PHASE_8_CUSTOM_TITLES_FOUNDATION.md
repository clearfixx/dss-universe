# Phase 8 — Custom Titles Foundation

## Status

Implemented as the fourth Phase 8 package.

## Boundary

Custom Titles are permission-neutral presentation awards.

```text
Title definition
  → administrative grant with reason
  → user-owned title collection
  → one cooldown-protected display selection
```

Titles are not roles, groups, levels, achievements, or permissions. No
authorization guard may derive access from a title.

## Data model

### CustomTitle

An administrator-managed definition contains:

- unique name and Unicode-compatible slug;
- six-digit hex presentation color;
- badge key or short badge value;
- optional description;
- active or archived state;
- creator and last updater evidence.

Definitions are archived rather than deleted. Archived definitions remain
attached to historical grants but cannot be newly granted or selected.

### UserTitleGrant

A grant records:

- recipient and title;
- administrator who granted it;
- mandatory public/business reason;
- grant timestamp;
- optional revocation actor, reason, and timestamp.

PostgreSQL rejects physical deletion of grant history. A partial unique index
allows only one active grant for a `(user, title)` pair while still permitting
a later re-award after revocation.

### UserTitleSelection

One row per user points to the active grant currently displayed. The selection
belongs to the user, not to the title definition.

Revoking the selected grant or archiving its definition clears selection
inside the same transaction. Grant history remains intact.

### CustomTitleSettings

The global policy stores `selectionCooldownDays` in the inclusive range
`0..3650`. Zero explicitly disables the delay.

The first selection is immediate. Selecting the already displayed title is
idempotent. Changing to a different grant is rejected until the current
selection timestamp plus the configured cooldown.

## Concurrency and evidence

- PostgreSQL advisory locks serialize definition, grant, settings, and
  per-user selection coordinates;
- active duplicate grants are prevented in both application flow and a
  partial database unique index;
- every mutation appends Audit and `custom-titles.*.v1` Outbox evidence inside
  the same transaction;
- grant deletion is rejected by a PostgreSQL trigger.

## Authorization

The package introduces:

- `custom-titles.manage`;
- `custom-titles.settings.manage`.

Both are seeded for administrator and owner roles. Guards check permissions,
never role names. Authenticated users may only select grants belonging to
their own account.

Titles themselves contain no permission key, role relation, group relation,
or entitlement rule.

## GraphQL

Authenticated discovery:

- `customTitles`;
- `userCustomTitles(userId)`;
- `customTitleSettings`.

Administrative discovery:

- `customTitlesAdmin`.

Mutations:

- create/update/archive definitions;
- grant/revoke with mandatory reason;
- self-select an owned active grant;
- update cooldown policy.

## Verification

Coverage includes:

- normalization and Unicode slugs;
- invalid presentation metadata;
- duplicate definition and grant conflicts;
- mandatory reasons;
- first and idempotent selection;
- cooldown rejection and policy update;
- selection change after cooldown is disabled;
- selected-grant revocation;
- archived definition visibility;
- permission-backed GraphQL administration;
- Audit and Outbox evidence;
- database-level grant retention;
- clean application of the complete migration chain.

## Next boundary

Achievements will build rule-based and manually granted badges from auditable
events. They remain separate from display-title choice.

> Roles open doors. Titles tell stories.
