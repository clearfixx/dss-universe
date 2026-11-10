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

## Command Deck administrative boundary — 29 October 2026

- `/command-deck` is a restricted administrator dashboard, **not** the regular-user Mission Control. No regular-user link points to this route.
- Access requires **both** the effective IAM capability `admin.command-deck.access` and the current `admin` or `owner` role. The capability is seeded for `admin`; `owner` inherits all registered permissions. An explicitly granted permission never promotes a regular user or moderator into an administrator.
- The GraphQL query `adminCommandDeckAccess` is protected by JWT and `PermissionsGuard`; a Next.js server component checks it before loading any dashboard data and returns 404 for unauthorized sessions.
- The shared Shell hides this admin destination in every navigation variant, the mobile launcher and the personal menu unless the server-side capability check returns true. Visibility is **not** a security guard.
- `proxy.ts` remains responsible only for authentication/session renewal; it does not infer administrator rights from JWT contents.
- Role/permission changes must propagate through the existing authoritative IAM reader. GraphQL denies anonymous/unauthorized access; SSR fails closed on API errors.
- A future dedicated user Mission Control must receive a **different user route** and is outside this focused security correction.

## Access revocation regression

- Quality Gate run 40924901550 passed for commit 24b6976 after adding Command Deck IAM protection and browser smoke coverage.
- Added a real GraphQL E2E regression verifying that revocation of `admin.command-deck.access` denies access using the **same unexpired JWT**, without requiring a new login. This relies on existing authoritative request-time access reads.
- Added isolated Next.js SSR tests: explicit `true` grants access; permission errors, malformed responses, false values, network failures and non-2xx responses fail closed.
- These new regression tests require green CI before being considered verified.

- A regression verifies that the same valid JWT loses Command Deck access when either the permission or administrator role is revoked, and that a permission alone does not grant the route to a regular user.

## Final route boundary audit — 30 October 2026

- `/settings/platform-appearance` now fails closed with the Next.js `notFound()` boundary when the backend's guarded `adminPlatformAppearance` query denies or cannot confirm access. Previously an error-state view returned HTTP 200 to unauthorized visitors.
- Server component regression tests cover denied access and all three valid Shell Variant values.
- Previous merged-main CI passed at commit `94d8532`; this page-boundary change requires its own green CI before acceptance.

## Navigation accessibility consistency — 30 October 2026

- Nested module routes now declare `aria-current="location"` on ancestor links and `aria-current="page"` only for exact destinations; this matches the visual active styling in Navbar, launcher and Sidebar.
- Breadcrumbs no longer incorrectly designate an ancestor as the current page when the actual nested route has no declared breadcrumb metadata. It remains navigable instead.
- Unit regression covers exact match, nested routes, prefix collisions and unknown routes. Dynamic-route display names still require explicit verified metadata before visual acceptance.
- A fresh CI result is required for these navigation changes.

## Nested breadcrumb completeness — 30 October 2026

- Breadcrumbs for nested routes without verified page-title metadata now end with a non-linked `Поточна сторінка` element (`aria-current="page"`); the URL slug is not treated as a trusted display title.
- Known module and child labels retain their exact existing navigation metadata. Future dynamic page titles should be supplied through an explicit route metadata contract rather than inferred from path segments.
- Unit tests cover news detail paths, a nested newsroom child, exact module pages and unknown routes. CI verification for this change remains pending.

## Sidebar current-location semantics — 31 October 2026

- A nested route must mark **only its deepest matching Sidebar destination** as `aria-current`, instead of marking both a module overview and a nested child as current.
- The Sidebar active background follows the same deepest-match selection. Navbar continues to mark the parent module as a location, preserving distinct global vs contextual semantics.
- Added unit regressions for exact, child, nested-child, news-detail and unknown routes. Await the new Quality Gate before treating this change as verified.

## Personal Hub responsive pass — 1 November 2026

- Removed the duplicate standalone Settings action from mobile and tablet header widths: profile settings remain available inside the Personal Hub menu, while the desktop quick action is retained. This leaves more room in narrow navigation headers without changing global logout behavior.
- The Personal Hub trigger now announces the authenticated viewer's normalized display name (or username fallback) instead of a generic menu label. The same normalized display name appears visually and in the dropdown header.
- New unit regressions cover whitespace-only, missing and valid display names. A fresh Quality Gate must confirm the complete shell change before promotion.
- Approved logo and final visual parity remain pending; no speculative logo asset or additional product functionality has been introduced.

## Guest navigation and proxy alignment — 3 November 2026

- `MODULE_NAVIGATION` now marks `/members` and `/media` as requiring a session, matching the existing `isProtectedPath()` proxy contract. Guest Shell menus should not advertise protected links that immediately redirect to login.
- All three Shell compositions share the `visibleModules()` projection; only `/news` remains a guest-visible module. Signed-in navigation retains `/members` and `/media`, while `/command-deck` still requires server-confirmed administrator permission.
- Regression tests compare every registered session-protected module against the proxy's shared route contract. The change is presentation-only and **does not modify authentication, proxy guards or IAM authorization**.
- Require a new green Quality Gate for this commit before treating the package as verified.

## Mobile drawer route lifecycle — 3 November 2026

- Drawer state is local and now associated with the pathname where the user explicitly opened it. A route transition, including Back/Forward initiated outside the drawer, resets it closed using a guarded render-time state adjustment; this avoids a `useEffect` race closing newly opened dialogs.
- Existing click-to-close behavior is retained. Pure regressions verify same-path open and closed states, nested navigation changes, and the committed closed state after a route transition.
- The next full Quality Gate and Web Smoke must pass before this package is considered verified. Approved designs and admin authorization remain unchanged.

## Browser history regression — 3 November 2026

- Added Playwright coverage of a guest opening the mobile navigation drawer on `/news`, changing the pathname through the browser History API (which Next.js synchronizes with `usePathname()`), returning via Back, and reopening the drawer explicitly.
- This exercises route-scoped drawer state independently of link click handlers, complementing existing mobile click-to-close and pure state regression tests.
- CI verification of the new browser scenario is required before acceptance; the test itself does not change application behavior.

## Narrow mobile header fit — 9 November 2026

- The temporary text wordmark now uses a compact visible `DSS` on small phones and the full `DSS UNIVERSE` from the `sm` breakpoint. Its accessible name consistently identifies the home link; this does **not** replace the approved logo asset.
- Added guest Playwright regressions for 320px and 375px widths, asserting the mobile launcher and sign-in link remain visible and the Shell header itself does not overflow horizontally.
- This focused Shell UX package intentionally does not merge the substantially diverged `main` branch. A separate reconciliation is required because concurrent work overlaps API schema, API package manifest, alignment tests and pnpm lockfile.
- Full CI verification is required before promotion.

## Navigation trigger accessibility — 9 November 2026

- Both the mobile drawer trigger and the desktop module launcher now expose `aria-haspopup="dialog"` and `aria-expanded` derived from the existing local Shell drawer state. This is an accessibility-only change; no new store or navigation behavior was introduced.
- Added Playwright coverage for expansion, Escape dismissal, and reopening on mobile, plus render regressions for the desktop launcher in collapsed and expanded states.
- The approved production logo asset and final visual parity are still pending; this package does not invent either. Require fresh CI verification before treating the package as completed.

## Route-owned breadcrumb titles — 10 November 2026

- The shared Shell accepts optional `TrustedPageTitle` metadata from a server-rendered route owner; the data includes the exact pathname plus a display title. The client never derives text from URL slugs.
- The metadata is applied **only when its pathname equals the active `usePathname()` value**. This prevents a stale title from a previous route being shown during client navigation. Empty or whitespace-only titles fall back to the existing neutral terminal label.
- Published news supplies its verified article title after `loadFullNews`; the editorial article route supplies the title only when `loadEditorialArticle` succeeds. Error states do not reuse or invent titles.
- The existing Shell navigation registry remains a presentation contract. Server IAM and editorial read authorization are unchanged; breadcrumb text is never an authorization input.
- Unit and server-markup regressions cover exact-path matching, stale metadata, blank titles, non-inferred slugs, semantic current-page markup, and unregistered paths.
- This is navigation architecture and accessibility work only. Mockup parity, final logo, and owner approval are still pending. Do not report lint/typecheck/unit tests/build as verified until CI completes on the current branch head.

## Contextual routes and semantic landmarks — 10 November 2026

- The root Shell registry remains the sole source for visible global module links. Existing, separately owned profile (`/profile/[username]`) and administrator-guarded appearance (`/settings/platform-appearance`) routes now receive breadcrumbs without being advertised as standalone modules.
- The profile route supplies its actual server-loaded public display name (falling back to username) using the exact profile pathname. Unknown or inaccessible profiles never publish profile metadata to the Shell.
- The appearance route supplies its own trusted title only **after** its existing server-side admin guard succeeds. The contextual breadcrumb links to the real profile settings page but does not reveal any new administrative destination in global navigation.
- Context paths are exact (appearance) or a single dynamic segment (profile). No routes, feature flags, permissions, or privileges were added.
- Removed a nested `<main>` from the news editor workspace. The Shell owns the sole main document landmark; the editor is now a labelled section.
- Unit and static-markup tests cover contextual paths, stale metadata, unregistered paths, one current-page breadcrumb, and the absence of hidden context destinations from global module navigation.
- CI verification for the latest head is required before merge. The final design and logo remain separate owner-approval gates.

## Validated-session route entry — 10 November 2026

- The home route no longer assumes `dss_access_token` cookie presence means an authenticated session. It awaits the existing server-only, request-cached `loadSessionViewer()`, which resolves identity through the backend Viewer GraphQL query and returns `null` on failure.
- The personal activity feed is queried only when an authenticated viewer has been confirmed. Missing, invalid, revoked, or unavailable sessions render the guest landing rather than the personalized dashboard.
- `/newsroom/new` also requires the validated viewer before mounting the new-draft workspace. Actual draft authorization and all mutations remain enforced by the backend (no frontend role assumptions added).
- New route-level unit coverage exercises validated/unvalidated cases for both routes, including that a guest homepage makes no private feed query.
- Session validation is request-scoped and reused by the Shell via React's `cache`; this avoids independently trusting cookie strings in each page. Proxy refresh behavior and existing IAM administration guards are unchanged.
- No new UX or product module has been introduced; CI and security workflows must pass before merge.

## Guest-only auth route loop prevention — 10 November 2026

- Found a routing defect in the existing Next.js proxy: a locally parsed JWT `exp` field was treated as sufficient evidence to redirect visitors away from `/login` and `/register`. Revoked or forged-but-unexpired tokens could make the sign-in form inaccessible, even though the backend Viewer resolver rejected them.
- Proxy now uses `exp` **only to decide whether a token refresh is necessary**. It does not redirect guest-only routes from unverified claims, including the successful token-refresh branch. Existing refresh-cookie handling, safe return-destination sanitization, protected path redirects, and server-only administrator permissions are preserved.
- The login and registration server components use the request-scoped, backend-validated `loadSessionViewer()` before redirecting to sanitized local `returnTo` destinations. When viewer validation fails, the forms stay available. No frontend permission role is fabricated.
- Unit coverage exercises unverified fresh tokens, refreshed tokens on guest routes, verified and unverified viewer states, and an attempted external return destination.
- UI design, route scope, and permissions are unchanged. This is a routing-security and account-recovery reliability fix.

### CI execution caveat

- Quality Gate run `42791644872` (attempt 2) failed with all three jobs showing **zero executed steps** and approximately three seconds of job runtime. The Storage workflows show the same symptom. This is not sufficient evidence to attribute failure to application source. GitHub Actions execution/billing/runners requires checking by the repository administrator.
- Until GitHub runners actually execute lint, unit tests, Playwright, and build on the current branch head, this package remains **unverified** and the App Shell PR stays draft/unmerged.

## Authentication response integrity and retry behavior — 10 November 2026

- The session proxy now distinguishes terminal credential rejection (HTTP 4xx except 408/429, and explicit GraphQL refresh errors) from retryable authorization-service problems (408, 429, 5xx, network failure, malformed successful token response). This prevents an upstream rate limit from destroying the user's refresh credential.
- Successful refresh results require **both** non-empty string tokens. A malformed 200 response is treated as temporarily unavailable instead of writing empty cookies.
- Login and registration share an authenticated response validator: the response must be successful, have no GraphQL errors, contain a non-empty user id, and include both non-empty token strings. Partial GraphQL successes must never create local sessions.
- Authentication requests now use a bounded 15-second timeout.
- Regression tests cover rate limiting, plaintext 401 responses, incomplete refresh responses, GraphQL partial success, invalid token pairs, and request timeout configuration.
- These changes are isolated to the web authentication boundary. They do not alter backend token issuance, revoke semantics, IAM permissions, or product UI.
- CI remains blocked before job steps execute on the private repository; no green status is claimed for these changes.

## IAM request minimization and fail-closed server rendering — 10 November 2026

- The server Application Shell now loads the backend-confirmed viewer and public appearance independently, then checks Command Deck IAM only if a viewer is present. The admin grant is therefore always false in guest/unverified sessions, even if an unrelated IAM response would have been available.
- Profile settings first establishes the viewer and loads the authenticated settings only for confirmed sessions. The owner-only appearance check is requested only after settings are successfully loaded; the backend appearance resolver still independently enforces the required role and permission.
- The Command Deck and platform appearance routes continue to enforce their own backend-backed guards before rendering protected content. Hiding controls and links is strictly a presentation layer, not access control.
- Server composition tests cover guest, ordinary and approved admin Shell states; unauthorized settings requests; Command Deck notFound on denied access; and the appearance route's deny-before-render behavior.
- No new role, API field, UI module, visual asset, or navigation destination has been introduced. CI must execute successfully before this batch can be called verified.

## Public profile resilience and validated viewer — 10 November 2026

- Public profile reads no longer equate an access-token cookie with a verified user. The request-scoped `loadSessionViewer()` determines whether to attach authorization. Revoked or invalid cookies are treated as guest viewing for otherwise-public profiles.
- Reused the validated viewer ID rather than issuing a second `ProfileViewerDocument` query, reducing redundant authenticated requests.
- The public profile itself remains the required primary API response; inaccessible or nonexistent profiles still fail. Once a valid viewer has loaded it, the wall, activity and gamification projections are independently optional. A failure in one no longer hides the profile or the other projections.
- Existing backend privacy checks still decide visibility. No private data is synthesized or rendered for visitors without a validated session.
- Tests cover stale-token guest behavior, verified identity, independent secondary failures, missing profile, and denied primary profile.
- Changes require actual lint/typecheck/unit/build validation before merge; GitHub Actions jobs remain blocked before execution.
