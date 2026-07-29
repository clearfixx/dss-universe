# Custom Titles Module Passport 🎖️

## Purpose

Custom Titles owns configurable presentation awards such as User of the Year,
Best Author, Wiki Guardian, and contest winner.

Titles decorate public identity. They never grant roles, groups, permissions,
moderation authority, or content access.

## Ownership

The module owns:

- title definitions with name, Unicode slug, color, badge, and description;
- active and archived title lifecycle;
- historical user grants and revocations with mandatory reasons;
- one selected display title per user;
- the global display-title change cooldown;
- Audit and Outbox evidence for every mutation.

## Invariants

- one user may hold several active titles;
- only one active grant may exist for the same user and title;
- only an active, non-revoked grant may be selected;
- selecting the current grant is idempotent;
- changing to another grant observes the configured cooldown;
- revoking or archiving a selected title clears its selection;
- grants are historical records and cannot be physically deleted;
- an archived title remains visible in historical grants;
- titles never participate in authorization decisions.

## Permissions

- `custom-titles.manage` — create, update, archive, grant, and revoke;
- `custom-titles.settings.manage` — change selection cooldown policy.

Self-selection requires authentication and ownership of the grant, not an
administrative permission.

## GraphQL

Queries:

- `customTitles`;
- `customTitlesAdmin`;
- `userCustomTitles(userId)`;
- `customTitleSettings`.

Mutations:

- `createCustomTitle(input)`;
- `updateCustomTitle(input)`;
- `grantCustomTitle(input)`;
- `revokeCustomTitle(input)`;
- `selectCustomTitle(grantId)`;
- `updateCustomTitleSettings(input)`.

> A title may change how a name looks. It must never change what the user may do.
