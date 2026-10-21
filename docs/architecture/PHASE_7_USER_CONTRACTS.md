# Phase 7 User Contracts

## Status

```text
PHASE 7 CONTRACTS AND FRONTEND DELIVERED
```

This document freezes the backend ownership and public API boundaries delivered
by Phase 7. It prevents later phases from duplicating social, interaction,
gamification or moderation concepts inside the Users module.

The freeze is additive: later phases may extend these contracts, but existing
privacy and ownership guarantees must remain intact.

## Users ownership

The Users module owns:

- public and owner profile projections;
- profile privacy policy;
- social links;
- follow relationships and user blocks;
- Members Directory identity projections;
- presence and last-seen policy;
- Profile Wall post ownership;
- profile completion;
- privacy-aware reads from the shared Activity projection.

Authentication owns account lifecycle, credentials and sessions.
Notifications owns delivery preferences.
Media owns avatar, cover and wall-image assets.

## Frozen GraphQL reads

Owner contracts:

- `viewer`;
- `viewerPrivacySettings`;
- `viewerProfileCompletion`;
- `viewerSessions`;
- `viewerNotificationPreferences`;
- `blockedUsers`.

Public authenticated contracts:

- `user(id)`;
- `userByUsername(username)`;
- `members(input)`;
- `followers(userId, pagination)`;
- `following(userId, pagination)`;
- `profileWall(profileOwnerId, pagination)`;
- `userActivity(userId, pagination)`;
- `presenceSummary`.

The public profile projection also exposes viewer-relative follow state through
`isFollowedByViewer`. The field is resolved through the social graph boundary
and never inferred on the client.

Both public profile lookup paths must use the same privacy projection. No
resolver or loader may expose a raw `UserRecord` or bypass profile visibility.

## Frozen GraphQL writes

- profile and social-link updates;
- privacy updates;
- follow/unfollow;
- block/unblock;
- Profile Wall create/remove;
- avatar and cover assignment/removal through Media;
- account lifecycle, credential and session mutations;
- notification preference updates.

## Privacy invariants

- inactive accounts are absent from public profile and directory reads;
- private profiles redact extended fields for other viewers;
- location, website, social links, last seen and online state follow their
  dedicated visibility switches;
- owners retain access to their own profile data;
- blocks are enforced on social graph, Profile Wall and activity reads;
- anonymous presence never persists raw network metadata;
- Activity is a public projection and never exposes audit metadata or content
  bodies.

## Deferred extensions

The following are deliberately not implemented inside Users:

- reputation, points, levels, badges and selected titles — Phase 8;
- custom groups and extended member filters — Phase 8;
- shared comments, reactions and reports — Phase 9;
- Profile Wall interaction moderation — shared Phase 9/10 infrastructure;
- cross-module home feed aggregation — Phase 9 Activity Feed;
- reputation-backed directory ranking and top periods — Phase 8;
- cross-module comments, reactions, reports and wall moderation — Phase 9–10.

## Delivered frontend surfaces

- `/profile/[username]` — responsive public/owner profile, social links,
  follow action, Profile Wall and privacy-safe activity;
- `/settings/profile` — profile, privacy, notification, media, credential,
  account lifecycle and session controls;
- `/members` — URL-backed search, role/online filters, deterministic sorting,
  pagination, privacy-safe presence metrics and TanStack Table.

Reads use GraphQL from React Server Components. Authenticated writes use Server
Actions that forward the HttpOnly credential to GraphQL. Zustand owns only the
transient profile tab, while filters remain shareable URL state.

## Change policy

Any future change to these contracts must:

1. preserve owner/public separation;
2. pass privacy regression tests for lookup by both id and username;
3. use shared platform modules instead of feature-local duplicates;
4. remain additive unless a versioned breaking change is explicitly approved;
5. update this document and the v1.0 Roadmap.

The profile has two coordinates, `id` and `username`, but only one airlock. 🛰️
