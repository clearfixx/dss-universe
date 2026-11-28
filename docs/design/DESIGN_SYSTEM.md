# DSS Universe — Design System v1.0

Status: implementation contract; visual acceptance pending.

## Principles

Use the owner-provided Design System and Navigation Language reference images, with later owner decisions taking precedence. Flat matte surfaces, restrained violet accents, quiet dividers, compact controls. No decorative glow, glossy icons or background gradients. Preserve modal backdrop blur. Preserve the approved Upload Center; shared changes must not regress its appearance or behavior.

## Foundation

Use semantic CSS tokens rather than page-specific colors. Proposed implementation baseline (subject to visual acceptance): background #0B0F14, shell #111827, cards #1A2332. Keep accessible foreground, focus and semantic status colors. Inter / Inter Tight is the typography direction; do not silently substitute a different font as final. Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96 px. Radius scale: 2, 4, 8, 12 px and full. Controls 4 px, compact details 2 px, cards and standard dialogs 8 px, large surfaces 12 px; full primarily avatars and indicators. Legacy radius values remain outside the opt-in scope.

Use existing shared React primitives, preserve their public API where possible, and normalize size, icon alignment, hover, focus, disabled, invalid and loading states. Preserve keyboard navigation, labels and focus restoration. Replace native selects where appropriate with accessible shared controls without breaking form submission. Dialog footer should use the same surface as the body.

### Implementation contract (DF-01)

The preview is opt-in via `DesignScope` in `apps/web/src/components/ui/design-scope.tsx`. Do not enable it at the document root until visual acceptance. React context carries the scope to Dialog, Sheet and DropdownMenu portal content without moving portal containers. Keep local class overrides and native accessibility contracts intact.

Inter and Inter Tight normal variable WOFF2 assets are bundled under `apps/web/src/app/fonts/` with Latin and Cyrillic subsets and SIL OFL licenses. No network font fetch is required during build. Heading tokens: display 48, H1 36, H2 28, H3 24, H4 20 px; body 18/16/14 and caption 12 px. Use these according to hierarchy, not as a mechanical global replacement.

Shared primitives:
- Button, Input, Textarea, Label, NativeSelect, Checkbox, Radio and Switch: preserve native events, refs, forms and class overrides. Choice fields use native HTML controls rather than a second selection engine; use Radix menus for actions, not form values. Switch is a native checkbox exposed as a switch.
- Dialog, Sheet, DropdownMenu: preserve focus restoration, keyboard navigation and backdrop blur.
- Card, Badge, Avatar, Separator: use semantic surface and status tokens; avatars retain circular shape.
- Table: native table markup with horizontal overflow. Sorting, selection, filtering and pagination remain feature responsibilities.
- Feedback (`feedback.tsx`): Alert, EmptyState, Skeleton and LoadingState. Use explicit live roles for dynamic messages, text labels alongside status colors, and motion-safe skeleton animation.
- NewsPagination and shell Breadcrumbs are existing navigation implementations; retain route ownership and current-page semantics.

This is a staged implementation, not a completion certificate. Control coverage and overlay tokens are implemented; responsive behavior, CI and owner screenshot review must be verified before DF-01 acceptance. Upload Center is excluded.

## Navigation

Navbar is global; desktop Module Launcher is a compact dropdown, not a second sidebar. Sidebar is contextual and must not waste space when empty. Toolbar owns contextual actions. Breadcrumbs use real routes, current page is not a link; mobile may show nearest accessible parent. Global actions must have real capabilities and permission checks. Mission Control is not Command Deck. Use DSS Intelligence naming. Do not invent roles, links or placeholder actions.

### Shell preview boundaries (DF-03B)

Opt the header, contextual sidebar, breadcrumbs and mobile navigation into v1 individually. The main route content and route-owned toolbar controls remain outside the scope until module acceptance; the toolbar layout alone uses consistent spacing. Portal content inherits the chrome scope. Do not scope the entire application shell or alter the approved Upload Center content. Personal Hub and Quick Add use actual existing actions; no role label or notification shortcut is fabricated.

### Public News preview (DF-04A)

News catalog, article, loading and error boundaries opt into v1 locally. Use semantic cards, native filters and shared feedback. Decorative synthetic gradient covers are replaced with a neutral icon fallback in the catalog; the full article no longer displays an empty decorative banner. Existing article content, links, attachment downloads, comments, sharing and pagination contracts are retained. Newsroom, forum-owned components and Upload Center are not migrated by this package.

## Internal UI Kit

Owner-approved location: Command Deck. Proposed route /command-deck/design/ui-kit, integrated by Claude using existing server authorization (canAccessAdminDeck). No public navigation or persistence. Showcase imports actual shared primitives, not replicas. Sections: foundations, components, navigation, overlays, feedback, patterns. Interactive variants and states, responsive preview where practical. No new dependency or Theme Engine implementation required.

## Delivery

DF-00 documentation; DF-01 foundation; DF-02 UI Kit; DF-03 App Shell; DF-04 module consistency; DF-05 visual acceptance. Keep PR #253 draft until owner acceptance. Coordinate via AGENT-CHAT.md; Claude owns administrative integration and community module work. No backend rewrite. Run lint, typecheck, relevant tests and build; compare real screenshots to owner references before acceptance. Do not mark an unreviewed screen accepted.

Reference images supplied in chat: product vision, navigation language, design system, community hub, logo animation, forum, user hover card. Original binary assets and final logo are not yet stored here; do not claim exact visual matching until verified.

### Newsroom preview (DF-04B)

Use scoped semantic editorial list, editor metadata fields, workflow panels and error states. Share editorial status presentation between list and workspace. Keep DssEditor outside any new DesignScope, including its embedded media upload UI; preserve document serialization, editor permissions, workflow guards, versions, scheduling and pin actions. The outer workspace grid remains unscoped until editor acceptance.

### Members and profile preview (DF-04C)

Scope directory and public profile locally; use native filters and shared table primitives, preserve URL filters and ranking data. Boundary pagination controls are real disabled buttons. Preserve profile cover images, social actions, privacy filtering, server-defined title/achievement colors and existing three-column composition. Replace decorative gradients with flat tokens; omit unimplemented overflow actions and unverified shield decoration. Active profile section is announced with aria-pressed. Loading and route failures use scoped feedback primitives. No changes to profile actions, permissions, data loading or Upload Center.
