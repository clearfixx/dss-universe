# GitHub Workflows

> Status: Active

`ci.yml` checks architecture, Prisma, lint, types, tests, generated GraphQL,
build, browser smoke and dependency security. `storage-security.yml` verifies
containment on Linux and Windows. Both run for pull requests and pushes to
`main`/`develop`; neither has a periodic schedule.

Superseded runs of the same workflow/ref are cancelled. Failed checks remain
visible and block acceptance; notifications are not silenced by disabling tests.

---

**Build for years, not for weeks.**
