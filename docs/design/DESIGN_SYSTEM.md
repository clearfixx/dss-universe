# DSS Universe — Design System v1.0

Status: implementation contract; visual acceptance pending.

## Principles

Use the owner-provided Design System and Navigation Language reference images, with later owner decisions taking precedence. Flat matte surfaces, restrained violet accents, quiet dividers, compact controls. No decorative glow, glossy icons or background gradients. Preserve modal backdrop blur. Preserve the approved Upload Center; shared changes must not regress its appearance or behavior.

## Foundation

Use semantic CSS tokens rather than page-specific colors. Proposed implementation baseline (subject to visual acceptance): background #0B0F14, shell #111827, cards #1A2332. Keep accessible foreground, focus and semantic status colors. Inter / Inter Tight is the typography direction; do not silently substitute a different font as final. Spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96 px. Radius scale: 4, 6, 8, 12, 16, 24 px and full. Proposed mapping: controls 4–6, cards 8, large panels/dialogs up to 12; full primarily avatars and indicators.

Use existing shared React primitives, preserve their public API where possible, and normalize size, icon alignment, hover, focus, disabled, invalid and loading states. Preserve keyboard navigation, labels and focus restoration. Replace native selects where appropriate with accessible shared controls without breaking form submission. Dialog footer should use the same surface as the body.

## Navigation

Navbar is global; desktop Module Launcher is a compact dropdown, not a second sidebar. Sidebar is contextual and must not waste space when empty. Toolbar owns contextual actions. Breadcrumbs use real routes, current page is not a link; mobile may show nearest accessible parent. Global actions must have real capabilities and permission checks. Mission Control is not Command Deck. Use DSS Intelligence naming. Do not invent roles, links or placeholder actions.

## Internal UI Kit

Owner-approved location: Command Deck. Proposed route /command-deck/design/ui-kit, integrated by Claude using existing server authorization (canAccessAdminDeck). No public navigation or persistence. Showcase imports actual shared primitives, not replicas. Sections: foundations, components, navigation, overlays, feedback, patterns. Interactive variants and states, responsive preview where practical. No new dependency or Theme Engine implementation required.

## Delivery

DF-00 documentation; DF-01 foundation; DF-02 UI Kit; DF-03 App Shell; DF-04 module consistency; DF-05 visual acceptance. Keep PR #253 draft until owner acceptance. Coordinate via AGENT-CHAT.md; Claude owns administrative integration and community module work. No backend rewrite. Run lint, typecheck, relevant tests and build; compare real screenshots to owner references before acceptance. Do not mark an unreviewed screen accepted.

Reference images supplied in chat: product vision, navigation language, design system, community hub, logo animation, forum, user hover card. Original binary assets and final logo are not yet stored here; do not claim exact visual matching until verified.
