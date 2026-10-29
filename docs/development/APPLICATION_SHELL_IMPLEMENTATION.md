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

## Required before merge

1. **Design parity:** canonical production logo asset; improved responsive layouts; reviewed Sidebar and Personal Hub states; route metadata for dynamic breadcrumbs.
2. **Server-owned admin configuration:** inspect existing Settings and IAM contracts, introduce typed persistent setting (prefer an established settings store if present), guarded GraphQL update, transactional audit, cache invalidation and admin UI preview/apply.
3. **No auth bypass:** administrative mutations require a dedicated effective permission. UI visibility alone is insufficient.
4. **Testing:** run `pnpm --filter @dss/web lint`, `typecheck`, `test`, `build`; run relevant API tests and desktop/mobile Playwright; verify no hydration mismatch or accidental private/public route changes.
5. **Manual UX approval:** test all variants on representative modules with real content. Compare UI against approved reference mockups.
6. **Review:** request owner approval before marking PR ready and before merging.

## Important boundaries

The first frontend increment does **not** claim completion of the server-side variant persistence. It currently defaults to `MODULE_LAUNCHER` and supports selection through the Shell component contract only. Avoid building a parallel permission engine, custom React router or client-only source of truth.

The old product documents use conflicting Mission Control / Command Deck terminology. Route `/command-deck` remains unchanged for compatibility; the user-facing label is Mission Control pending route migration decision.

### Verification notes

Direct GitHub content edits do not execute local commands. GitHub CI status and resulting test evidence must be checked before promotion. Nothing in this file implies that build or runtime verification has passed.
