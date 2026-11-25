# App Shell — owner-approved architecture contract

## Responsibilities
- Navbar: global module navigation and global actions (search, notifications, Quick Add, bookmarks, Personal Hub). Toolbar: route-owned contextual actions only.
- Sidebar: contextual sections of the active module; do not duplicate the global module registry in the persistent desktop sidebar. A mobile drawer may expose both levels, clearly separated.
- Breadcrumbs: semantic route-owned hierarchy, exact-path metadata, no invented destinations. Current page is not a link.
- Keep MODULE_LAUNCHER, HORIZONTAL_NAVIGATION and HYBRID as distinct global navigation compositions. A launcher exposes accessible modules; horizontal overflow must remain reachable; hybrid exposes featured modules plus launcher.
- Modules register implemented routes, labels, icons and presentation eligibility centrally. Child actions respect guest/session eligibility. Server/API authorization remains authoritative; verified viewer precedes IAM.
- Module owners may supply contextual sections, breadcrumb trails and toolbar actions through shared contracts. No module-specific forks of Shell, changes to global layout, new theme decisions or authorization bypasses without owner approval.

## Visual direction
- Preserve current approved mockup direction while refining behavior: restrained, premium, flat; violet/navy palette through semantic tokens, no glow, glossy icons, decorative gradients or heavy borders. Space is an allegory, not a visual requirement.
- Navbar and Sidebar must remain usable across mobile, tablet and desktop, including 1440px. No clipped unreachable tabs; keyboard focus visible. Search must be reachable on mobile and shortcuts must not hijack hidden controls.
- Keep the existing logo until the owner supplies the canonical asset. Personal Hub reference is not a frozen final design. Upload Center approved screen is out of scope.
- Appearance variants are admin-controlled; guests cannot change platform appearance. Do not conflate navigation variants with future visual themes.

## Delivery
- Work from current main in scoped branches. Coordinate shared Shell changes in coordination/codex-claude before editing overlapping files.
- Preserve Community/Forum integration, server guards, existing route contracts and approved visual direction. Add regression coverage for variants, roles, routes, responsive overflow, keyboard and stale breadcrumbs. Run lint, typecheck, tests and build; report actual results in PR. No merge without owner approval.
