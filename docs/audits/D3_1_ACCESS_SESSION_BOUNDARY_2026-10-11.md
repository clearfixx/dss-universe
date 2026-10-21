# D3.1 — Authoritative Access-session Boundary

> Date: 2026-10-11. Branch: `debt/d3-auth-identity-boundary`.
> Base: D2 commit `7f0e354`. Review package only; whole D3 remains incomplete.

## Delivered

Core JWT strategy no longer queries Prisma or inspects account ORM records.
It consumes an explicit capability using opaque subject/session IDs and access
version. Auth owns eligibility evaluation and the narrow persistence adapter.
The feature composes strategy and capability together without core-to-feature
imports. Named imports/exports and DSS File Passports accompany changed sources.

The adapter retrieves only session owner, expiry, revocation, account status and
auth version. Every request observes current state. Denied or failed lookups
cannot create an authenticated principal. Existing JWT/API request context is
preserved; profile-bearing claims and other Auth/Users coupling await D3.2.

No frontend, Prisma schema, migration or dependency changes. Real application
startup regenerated GraphQL schema ordering; canonical comparison with
`buildSchema` / `lexicographicSortSchema` / `printSchema` confirms no semantic
API-contract change. The generated file was not manually edited.

## Evidence

- Focused unit tests: 3 suites, 24 passed; malformed claims, owner mismatch,
  expiry including equality, revocation, inactive accounts, changed version,
  authoritative reread, lookup failures and adapter field allowlist.
- Full API units: 74 suites passed, 1 skipped; 326 tests passed, 3 skipped.
- Real AppModule/GraphQL E2E: 6 selected tests passed, 7 unselected tests skipped,
  40.952 seconds. Registration/viewer, unauthenticated error, schema secrecy,
  account deactivation/reactivation, credential changes and session revocation.
  This is not a claim that the entire E2E suite passed.
- Lint: 9 tasks successful; API fresh, 8 cached.
- Typecheck: 9 tasks successful; API fresh, 8 cached.
- Build: 6 tasks successful; API fresh, 5 cached.
- Prisma validation passed; disposable test DB has all 52 migrations applied.
- Changed-file Prettier and `git diff --check` passed. Repository-wide Prettier
  remains red on 41 pre-existing files outside this package.
- Architecture checks and 28 analyzer fixtures passed; frozen feature inventory
  remains 156. Core persistence was outside that inventory, so its removal is
  not represented by a lower feature finding count.

Development PostgreSQL/Redis, Mailpit and ClamAV are healthy. Dedicated test
PostgreSQL/Redis are healthy. No production data or credentials are used.

## Remaining work and baseline limitations

D3.2 registration/profile composition, auxiliary Auth dependencies and IAM state
integration remain. No declaration of complete module isolation is warranted.
Global dependency-audit, formatting and Web smoke debts remain open. D2 CI's
six-hour API E2E timeout is DEBT-038, not fixed by these selected local scenarios.
No red stacked PR is merged.

The owner product vision and corrected Mission Control/Command Deck names are
recorded separately. DEBT-039 tracks product/module reconciliation before Phase 11. Illustrative progression weights are not silently adopted as an objective
formula. Expanded Media, points purchases and anti-cheat remain post-1.0.
