# Agent helper scripts

All new ad hoc diagnostic and maintenance scripts belong here, grouped by task
when useful. Do not author helpers in node_modules caches or OS temp folders.
Established component build/test tools remain with their owning module.

## Preserved originals

`archive/cache-d6/` contains47 helpers and `archive/cache-d5/` contains7 helpers
moved out of the backend worktree caches. All54 files retain their exact bytes;
`archive-manifest.json` records original relative paths, sizes and SHA-256.
The frontend checkout was not switched or edited. Generated Playwright/browser
cache files and verification reports were not moved.

Run `pnpm helpers:verify` to verify every preserved file without executing it.
After staging, `node tools/agent-helpers/verify-archive.mjs --staged` also verifies
the exact bytes stored in Git's index. Full quality and CI require archive checks.
Git attributes disable newline conversion for the archive, and Prettier leaves
historical originals unchanged. Maintained tools outside archive follow normal
formatting and File Passport rules.

Archived scripts are historical: some contain old worktree paths, expected commit
IDs or task-specific mutations. Review/adapt one before reuse; do not run them
as a batch. Their original headers intentionally retain the old cache paths.

`preserve-cache-helpers.ps1` is the one-time migration tool. Its default mode only
plans explicit source worktrees; `-Apply` performs individually bounded moves
with before/after hashes and refuses overwrites. Local migration receipts use
`*.local.json` and are not committed. Credentials never belong in tracked helpers.
