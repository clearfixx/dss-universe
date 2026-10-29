# Application Shell v1.0 — implementation ledger

Status: **in progress / not approved for merge**  
Branch: `feature/application-shell-v1`

## Approved product contract

- One shared Shell with **MODULE_LAUNCHER**, **HORIZONTAL_NAVIGATION** and **HYBRID** global navigation variants.
- Contextual module Sidebar, breadcrumbs and optional page-specific Toolbar.
- Navbar and Sidebar use lighter-than-page semantic surfaces and understated dividers.
- The approved DSS logo is authoritative; the source artwork must be supplied as a **separate clean production asset** before replacing the temporary text wordmark.
- No permanent space-themed decorative treatment in content areas; space is a brand metaphor.
- No fabricated search, inbox, analytics or AI functionality.
- Global variant selection belongs to an authorized administrative setting, not to a user cookie or Zustand.
- Later personal appearance settings are typed presets governed by IAM / progression; no user-controlled HEX, CSS or numeric font values.
- Existing public routes and the approved Upload Center must retain their behavior.

## Implemented in this branch

- Typed three-variant navigation contract and a single registry of **verified implemented routes**.
- Three global compositions sharing module link semantics.
- Contextual Sidebar and known-route breadcrumbs.
- Accessible mobile module drawer; closes after route navigation.
- Optional contextual Toolbar slot, skip-to-content link, active-link accessibility states.
- Shell-specific surface and divider tokens, without changing the global component palette.
- Unit tests for the pure navigation contract.
- Platform appearance Prisma enum and migration, domain repository port and infrastructure adapter.
- GraphQL public and guarded administrative queries and guarded mutation using existing `system.settings.update` permission.
- Transactional audit of configuration updates.
- SSR retrieval with per-request fallback to the default Shell Variant.
- Protected administration page with local preview and explicit save; link visible from profile settings only to permitted viewers.
- Backend service and repository unit tests.

## Required before merge

1. **Design parity:** canonical production logo asset; improved responsive layouts; reviewed Sidebar and Personal Hub states; route metadata for dynamic breadcrumbs.
2. **Server-owned admin configuration:** review the implemented Settings / IAM integration, run migrations and verify update/query/re-render workflows end-to-end. The current read policy uses request-scoped memoization and `no-store` (no cross-request cache to invalidate).
3. **No auth bypass:** administrative mutations require a dedicated effective permission. UI visibility alone is insufficient.
4. **Testing:** run `pnpm --filter @dss/web lint`, `typecheck`, `test`, `build`; run relevant API tests and desktop/mobile Playwright; verify no hydration mismatch or accidental private/public route changes.
5. **Manual UX approval:** test all variants on representative modules with real content. Compare UI against approved reference mockups.
6. **Review:** request owner approval before marking PR ready and before merging.

## Important boundaries

The branch includes tested server-owned variant persistence, request-scoped SSR reads, and GraphQL appearance authorization. Quality Gate run 40917724836 passed for commit 2ec900c, including API E2E, Web Smoke, Prisma, lint, typecheck, unit tests and build. Later commits require a fresh CI result before promotion. Without a valid API response, Shell falls back to `MODULE_LAUNCHER`. Avoid building a parallel permission engine, custom React router or client-only source of truth.

The old product documents use conflicting Mission Control / Command Deck terminology. Route `/command-deck` remains unchanged for compatibility; the user-facing label is Mission Control pending route migration decision.

### Verification notes

Direct GitHub content edits do not execute local commands. GitHub CI status and resulting test evidence must be checked before promotion. Nothing in this file implies that build or runtime verification has passed.

## Architecture corrections — 29 October 2026

- Historical Prisma-defaults E2E query now enumerates the fifteen historical tables under test instead of accidentally asserting that newer tables may not define an `updatedAt` default.
- New real-database Appearance atomicity E2E checks no-write default, committed audit history, and transaction rollback on audit failure.
- Local Shell navigation drawer visibility is component-local React state, not globally shared Zustand state. Closing is performed by navigation handlers and the dialog itself; no mount/route effect can override an open gesture.
- Contextual Sidebar children remain visible on sibling routes (stable module navigation).
- Browser regression spec covers the launcher and mobile drawer; Web Smoke passed on commit 2ec900c.
- Appearance transport and database E2E passed together on commit 2ec900c (Quality Gate run 40917724836). A malformed GraphQL enum currently produces a rejection with HTTP 5xx; transport status normalization is outside this Shell change and should be tracked separately.
- The feature branch is not synchronized with the latest main; reconcile upstream changes and re-run the entire quality gate before eventual merge. No merge has been performed.

## Guest navigation boundary

- All three global variants use a single `visibleModules(hasSession)` projection. Session-only destinations are suppressed for guests; this is presentation logic, not authorization.
- The web E2E scenario verifies public News remains navigable and protected Mission Control does not appear in the guest launcher. The previous test incorrectly asserted the opposite and was updated.
- Full permission-aware module visibility (beyond session presence) must consume a trusted server-computed capability set when the corresponding module contracts are available. Do **not** infer permissions from frontend role names.

## Data integrity — Mission Control

- Removed hard-coded level, mission, points and streak metrics, along with invented fallback activity entries. The dashboard now displays only actual feed items, or explicit empty/unavailable states.
- AI Core briefing remains a deterministic summary of feed counts, not an AI-generated response or an operational chat action.
- The user-facing dashboard now uses **Mission Control** while retaining `/command-deck` for route compatibility.
- These latest dashboard changes require a new green CI run before merge.
