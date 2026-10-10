# D0.6 — Portable storage containment

Branch: `debt/d0-6-storage-security`, stacked on `debt/d0-5-dependencies`.
Status: implemented; focused Windows/Ubuntu CI passes; owner review pending.

## Finding and remediation

API LocalStorageProvider, Worker image processing and ClamAV scanning compared
native `path.relative()` output against `../`. Windows returns backslashes, so
that check did not reject a sibling traversal. The Worker also validated variant
keys after writing the original image.

`@dss/storage` is a dependency-free technical workspace package, not a Media
business module. Its explicit exports normalize portable storage keys and
resolve them beneath a trusted root using native path boundaries. Both apps
consume this contract; neither imports the other's implementation.

Absolute/drive-relative paths, traversal, dot/empty segments, control characters,
Windows device names, alternate streams and trailing dots/spaces fail closed.
Backslashes in valid relative keys normalize to forward slashes. Percent escapes
are literal filename characters, never URL-decoded. This is intentionally stricter
than silently stripping leading slashes or repairing malformed keys. Current
Media generators already produce accepted opaque keys.

Worker preflights source, destination and every variant before any filesystem
effect; ClamAV validates before opening TCP. API validates directory and filename
before creating directories. Read, delete and source cleanup use the same contract.

## Sharp cleanup

The metadata assertion opened a second file-backed Sharp pipeline whose cache
could retain the output handle on Windows. Reading bytes before metadata inspection
removes that test-owned handle. Production Sharp configuration is unchanged.
Five consecutive image-suite runs passed. The expanded conversion test additionally
verifies production source cleanup, and recursive temporary-root cleanup succeeds.

## Verification

- Shared storage: 43 passing cases; coverage 94.11% statements/lines,
  95.45% branches, 100% functions. The final defensive native containment throw
  is unreachable for accepted keys in the covered trusted-root configuration.
- Worker: 36 tests passing across 9 files, including preflight variant rejection,
  invalid source cleanup and no TCP connection for malformed scan keys.
- API unit suite: 308 passed / 3 skipped across 72 passing suites.
- Lint and typecheck: 9/9 Turbo tasks pass, including dependency builds.
- Build: 6/6 tasks pass; unchanged Web build is a cache hit.
- Prisma validation and architecture/license checks pass.
- Full repository format check retains 50 pre-existing file failures; changed files
  are formatted separately. No baseline files are rewritten to force a green gate.
- `.github/workflows/storage-security.yml` runs focused API tests, shared keys
  and the full Worker suite on Windows and Ubuntu without database dependencies.
  Run `38077108683` on code commit `c0a5137` passes both platforms (Ubuntu 43s,
  Windows 1m37s). Quality Gate run `38077108638` has a failing dependency audit;
  quality and Web smoke jobs are still pending at this checkpoint.
- No migration, UI, policy or authorization change.

This package does not close D0.5's audit advisory, Web smoke drift or API E2E
baseline. No successful full CI/E2E claim is made and no PR is merged.

## Security boundary and follow-up

Containment is lexical, not physical. The root and directories must be controlled
by trusted application processes. Symlinks/junctions or concurrent local writers
can violate physical isolation; DEBT-037 records a separate threat-model decision.
Do not claim protection against arbitrary hostile local filesystem mutation.
