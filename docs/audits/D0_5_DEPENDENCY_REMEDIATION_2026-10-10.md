# D0.5 — Dependency security remediation

> Status: IN PROGRESS — Prisma config override verified; braces remains a blocker
>
> Branch: `debt/d0-5-dependencies`
>
> Baseline: D0 commit `0e49af2`; stacked on `debt/d0-environment` pending review.

## Scope and constraints

Security updates only. No UI redesign, module ownership changes, schema changes,
major dependency upgrades or audit suppressions. Existing red checks remain
release blockers. Dependency declarations and the generated lockfile must be
reviewed together; an audit result alone is not compatibility evidence.

## Baseline evidence

`pnpm audit --json` reports 140 findings: 7 critical, 63 high, 61 moderate,
9 low. Counts are advisory entries, not distinct exploitable vulnerabilities.

Runtime-exposed priority groups include Next.js, Express/proxy-addr, Multer,
Sharp, Joi and editor/ProseMirror dependencies. Tooling groups include
Handlebars through test tooling, shell-quote, Vitest, GraphQL code generation,
and Prisma development tooling. OpenTelemetry auto-instrumentation also brings
drivers not used by the application: dependency presence must not be confused
with an enabled runtime integration. Full path/reachability classification is
still pending and no risk exceptions have been accepted.

The registry identifies Next 16.3.8 as a patched version for the latest reported
Next findings. Upgrade Next and eslint-config-next together from 16.2.9 to
16.3.8, staying on major 16. The local Next upgrade guide was read before edits.
Root Turbo's floating `latest` declaration is pinned to the existing locked
2.11.2 before recursive in-range updates, avoiding an implicit major upgrade.

Upstream references:

- [Next image optimization SSRF advisory](https://github.com/vercel/next.js/security/advisories/GHSA-cjq9-62q9-8jv4)
- [Sharp bundled librsvg advisory](https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w)

## Verification status

- Baseline D0 CI run `38065396646`: dependency audit and Web smoke failed;
  API E2E remains in progress at inspection. No successful CI build is claimed.
- Local dev processes stopped before installation to avoid Windows locks and
  concurrent-memory pressure. Docker databases and volumes preserved.
- Recursive in-range update completed. Next/eslint-config-next 16.3.8,
  Prisma family 7.10.0, Sharp 0.35.5 and Vitest/coverage 4.1.11 are aligned.
- Narrow overrides: GraphQL Tools utils 12.0.0 -> 12.0.3 (Nest pins it),
  Prisma 7.10.0's mysql2 3.15.3 -> 3.23.1. No major override applied.
- Audit now reports **0 critical, 2 high, 10 moderate, 0 low**.
- Frozen installation passed again after aligning API Prettier.
- Prisma generation/validation and architecture/license checks passed.
- Typecheck: 7/7 tasks passed.
- Web unit tests: 25 files / 59 tests passed with two workers.
- Worker: 25 passed / 3 failed, matching the known containment/Sharp cleanup
  baseline (DEBT-020/023). Not waived by this package.
- The initial lint run exposed formatter-version drift after API Prettier's
  in-range update. API Prettier is now pinned to the existing root 3.8.4;
  no application code was reformatted. Repeat lint: 7/7 tasks passed.
- Production build: 5/5 tasks passed, including Next 16.3.8.
- API unit tests: 71 suites passed, one failed, one skipped; 294 tests passed,
  one failed, three skipped. The failure is the known storage-containment bug.
- Shared Editor: 2 files / 9 tests passed.
- Root format check: existing 50 files remain non-compliant. Changed files
  were formatted independently; no broad formatting rewrite applied.
- API E2E, coverage, browser E2E and generated GraphQL consistency are not
  claimed as verified for this dependency update. Full gate remains red.

## Remaining risks requiring a decision

1. **High: deepmerge-ts 7.1.5**, pinned by latest stable @prisma/config 7.10.0.
   The advisory's fix starts at major 8. No unapproved major override is used.
   Configuration merging is a tooling/configuration path; full runtime
   reachability assessment remains necessary before any exception.
2. **High: braces 3.0.3**, via micromatch/fast-glob in Nest schema tooling and
   Web tooling. npm audit proposes 3.0.4, but the registry rejects that version
   and identifies 3.0.3 as latest. The GitHub advisory says no patched version.
   A failed trial override was removed; install was then successful. Do not
   suppress the advisory or claim a nonexistent patch is installed.
3. Moderate: js-yaml via Swagger (reported fix major 5), sprintf-js via test
   tooling, and eight OpenTelemetry instrumentations. The latter require
   coordinated updates beyond their current pre-1.0 compatibility ranges.
   These are not automatically approved merely because their major is zero.

Sources: [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm),
[deepmerge-ts advisory](https://github.com/advisories/GHSA-ggr8-5vv4-36mx).

No security exception, major upgrade or replacement package is authorized by
this report. Owner decision is required before changing those boundaries.
The legacy Apollo Playground plugin still declares Apollo Server ^4 while the
application uses 5.5.1. This peer warning is not a new security exception.
Parcel watcher build script is explicitly disabled; do not authorize newly
introduced install-time code without review.

## Follow-up reachability review

The continuation review confirms both high findings also appear in
`pnpm audit --prod` (0 critical / 2 high / 9 moderate). Moving tools between
dependency sections therefore cannot be treated as a security fix.

### deepmerge-ts

Installed `@prisma/config` 7.10.0 imports `deepmerge` in
`loadConfigTsOrJs` and passes it as c12's configuration merger. That loader
disables remote config extension, RC files and package.json loading.
The repository's `apps/api/prisma.config.ts` supplies a static schema path,
migration/seed paths and an environment-derived database URL. No direct
application import of deepmerge-ts was found. The advisory specifically
requires recursive JavaScript object graphs; ordinary JSON cannot express
that condition. No request-to-merger route was identified in this review.

This is a scoped static assessment, not proof of universal unreachability.
Trusted repository/configuration execution remains an assumption. Latest
stable @prisma/config is still 7.10.0 and pins deepmerge-ts 7.1.5. Version
8.0.0 is published, but a scoped override crosses a major compatibility
boundary and requires owner approval plus Prisma config/client/migration
regression verification. Prisma prerelease major upgrades are not proposed.

### braces

Nest GraphQL's `mergeTypesByPaths` returns before calling glob utilities when
typePaths is absent or empty. The repository's Core GraphQL uses
autoSchemaFile/code-first and supplies no typePaths. Web GraphQL codegen uses
the checked-in literal pattern `src/graphql/**/*.graphql`. No application
import of braces, micromatch or fast-glob was found in authored application
source or compiled API output. This does not exclude all transitive runtime
uses; it establishes the inspected schema/codegen paths use trusted inputs.

The registry still reports braces 3.0.3 as latest and rejects 3.0.4. The
upstream advisory says no patched version. No replacement, vendored patch,
audit exclusion or change to schema discovery was applied.

### Proposed decision, not an accepted exception

- For deepmerge-ts: authorize only the @prisma/config 7.10.0 -> deepmerge-ts
  8.0.0 override investigation and regression checks, with rollback on
  incompatibility; do not upgrade Prisma to a prerelease.
- For braces: retain the release blocker until a published fix or an approved
  reviewed local patch is available. A time-limited exception is an owner
  decision, not an automatic consequence of limited observed reachability.

PR #3 CI run `38073373262` reports dependency audit and Web smoke failures;
quality has reached API E2E and is still in progress at inspection. Later
GraphQL/build CI steps are not yet verified. No workflow change was made.

## Approved deepmerge-ts override verification

After the reachability review, the owner explicitly approved investigating
the narrow major override. Workspace override:
`@prisma/config@7.10.0>deepmerge-ts: 8.0.0`. No other parent is overridden;
Prisma remains stable 7.10.0. Earlier no-major-approval statements above
describe the prior review state, not this subsequently approved change.

Upstream [v8 release notes](https://github.com/RebeccaStevens/deepmerge-ts/releases/tag/v8.0.0)
describe changed Map merging, renamed custom metadata types and corrected
deepmergeInto mutation behavior. The inspected Prisma path calls deepmerge
on configuration records, not those renamed custom APIs or deepmergeInto.
Local checks do not establish compatibility for arbitrary external configs.

Verification after the override:

- `pnpm why -r deepmerge-ts`: one installed version, 8.0.0, through Prisma config.
- Frozen lockfile installation passed.
- Prisma validate and generate passed with client 7.10.0.
- Existing disposable dss_test database: all 52 migrations already applied;
  status and deploy passed without pending migrations.
- Separate fresh disposable database `dss_d05_mergecompat` on test PostgreSQL
  port 5434: all 52 migrations applied successfully, then seed completed.
  This database is intentionally retained for follow-up verification; no
  development database or existing test data was reset.
- One-off Node assertions resolved deepmerge through Prisma's own dependency
  path: plain nested config merge, unchanged input objects and recursive graph
  handling all passed without stack exhaustion. No exploit workload was run
  against the application service.
- Lint: 7/7 tasks passed; typecheck: 7/7 passed; build: 5/5 passed, with unchanged
  package cache reuse. API was rebuilt after the lockfile change.
- Architecture/license checks passed. API unit rerun: 71 suites passed, one
  failed, one skipped; 294 tests passed, one failed, three skipped. The single
  failure remains the existing storage containment defect (DEBT-020).
- Latest audit: **0 critical / 1 high / 10 moderate / 0 low**. The remaining
  high is braces; this package remains unaccepted and must not be merged.

## Final acceptance requirements

No unaccepted critical/high findings, reviewed dependency paths, reproducible
frozen installation, Prisma generation/validation, lint, typecheck, tests,
production build and architecture/license checks. Report existing baseline
failures separately; do not merge until required checks are green.
