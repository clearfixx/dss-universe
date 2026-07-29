# Phase 8 — Gamification Frontend

## Status

Implemented as the final Phase 8 package.

## Purpose

The frontend composes the approved Phase 8 bounded contexts without inventing
new balances or score formulas:

```text
Community Points → level progress and leaderboard position
Reputation       → visible trust score and explained member rating
Custom Titles    → selected identity accent
Achievements     → earned profile badges
```

GraphQL remains the source of server state. Zustand owns only transient profile
navigation, and TanStack Table owns the Members Directory table instance.

## Profile experience

The authenticated public profile now presents:

- current level and Community Points;
- progress toward the next configured threshold;
- reputation score;
- recent explainable Community Points and reputation history;
- selected custom title beside the display name;
- all active granted titles;
- owner title selection when multiple grants are available;
- earned achievements with color, badge, name, and award reason;
- visitor `+1` / `-1` reputation form with mandatory explanation.

The UI repeats the 24-hour reputation rule, while the API remains the
authoritative enforcement boundary.

## Members Directory experience

The directory retains independent search, role, presence, and pagination
filters. Above it, the leaderboard provides:

- top-three member cards;
- month, year, and all-time URL-backed periods;
- Community Points, level, and selected title;
- the authenticated viewer's rank and period points;
- a clear statement that Community Points alone determine position.

Directory sorting is not silently replaced by leaderboard sorting. The two
projections are visually composed while preserving their separate contracts.

## Rendering and data flow

Profile identity loads first, then wall, activity, and gamification requests
start in parallel from the Server Component data boundary.

Members and leaderboard data share one typed GraphQL operation. Access tokens
stay in server-only Apollo context and are never serialized into Client
Components.

All timestamps cross the Server/Client boundary as strings. Client components
are synchronous and receive only generated GraphQL projection types.

## Mutations

Reputation and title selection use authenticated Server Actions:

- `giveReputation` receives the recipient, value, and mandatory reason;
- `selectCustomTitle` receives an owned active grant;
- successful mutations revalidate the affected public profile.

No client component receives an access token or writes Apollo cache manually.

## Verification

Coverage proves:

- leaderboard cards, period controls, viewer position, and profile links;
- level, points, reputation, title, and achievement rendering;
- owner/visitor profile composition;
- generated GraphQL operation compatibility;
- strict TypeScript and ESLint;
- React unit tests and Next.js production build.

## Phase boundary

Phase 8 is complete after this package.

Phase 9 introduces the shared Interaction Platform and content target registry.
Gamification may consume its semantic events later, but the frontend must not
couple itself to future News, Community Hub, or Knowledge Forge tables.

> The interface explains the astronaut's progress. The ledgers still remember
> every step.
