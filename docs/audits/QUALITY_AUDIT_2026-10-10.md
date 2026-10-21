# DSS Universe — Quality Baseline Audit

> Status: Partial runtime audit; Node 24 and Docker rerun required
>
> Date: 2026-10-10
>
> Execution environment: Windows, Node 22.22.3, pnpm 11.9.0

## Executive result

The current repository does not pass its required quality baseline.

- production build succeeds;
- Prisma schema validation succeeds;
- architecture and editor-license checks succeed within their current narrow
  scope;
- lint and typecheck succeed only after manually building `@dss/editor`;
- clean-checkout lint/typecheck orchestration is broken;
- format check fails on 52 files;
- root tests stop after 3 Worker failures;
- one Worker failure proves a Windows path-traversal validation defect;
- API and Web test completion is unproven because Turbo stopped after the
  Worker failure;
- E2E, coverage, GraphQL consistency and Docker-backed checks remain pending.

All commands must be repeated under the pinned Node 24.18.0 before acceptance.
Results under Node 22 are diagnostic evidence, not release certification.

## Command evidence

| Check                        | Result              | Evidence and limitation                                       |
| ---------------------------- | ------------------- | ------------------------------------------------------------- |
| Prettier repository check    | **Fail**            | 52 files reported with style issues                           |
| Architecture checker         | Pass                | Does not cover known module/layer violations                  |
| Editor license checker       | Pass                | No Tiptap Pro/Cloud dependency detected                       |
| Clean-checkout lint          | **Fail**            | 148 API findings caused by unresolved `@dss/editor` types     |
| Clean-checkout typecheck     | **Fail**            | 14 Web findings caused by missing `@dss/editor/dist`          |
| Lint after Editor build      | Pass                | Confirms orchestration/root-cause hypothesis                  |
| Typecheck after Editor build | Pass                | Confirms orchestration/root-cause hypothesis                  |
| Root production build        | Pass                | All five build tasks passed under Node 22                     |
| Prisma validation            | Pass                | Schema valid; no migration or DB connection performed         |
| Root tests                   | **Fail/incomplete** | Worker: 20 passed, 3 failed; later suites not proven complete |
| Dependency audit             | **Fail**            | 7 critical, 63 high, 61 moderate, 9 low advisories            |
| API E2E                      | Pending             | Requires healthy disposable services and pinned runtime       |
| Web E2E                      | Pending             | Requires healthy application stack and pinned runtime         |
| Coverage                     | Pending             | Root `quality` does not request it explicitly                 |
| GraphQL consistency          | Pending             | Root `quality` omits `graphql:check`                          |

## Clean-checkout orchestration defect

`@dss/editor` exposes its runtime and type entry points only from `dist`.
However, Turbo defines `typecheck` as depending on `^typecheck` and `lint` as
depending on `^lint`; neither guarantees that dependency build artifacts exist.

On a checkout where `packages/editor/dist` is absent:

- Web cannot resolve `@dss/editor` during typecheck;
- API type-aware linting receives unresolved editor types and emits a large
  cascade of unsafe-type findings.

After `pnpm --filter @dss/editor build`, both root lint and root typecheck pass.
The fix belongs in package/export/build orchestration, not in suppressing the
downstream TypeScript or ESLint diagnostics.

## Worker security defect

Both `ClamAvMediaMalwareScanner` and `LocalMediaFileProcessor` attempt to block
storage keys outside the configured upload root. Their validation checks:

```ts
relativePath.startsWith("../");
```

On Windows, `path.relative()` uses backslashes, so an escaping path is returned
as `..\\escape...` and bypasses that condition. The failing tests demonstrate
that the supposedly rejected input proceeds to network or processing work.

This is a Critical cross-platform path-containment defect. The remediation must
use platform-correct path semantics and share one narrow, tested storage-key
resolver rather than duplicate security logic across scanner and processor.
Linux and Windows cases, absolute paths, separator variants, sibling-prefix
collisions and encoded/untrusted boundary behavior require focused tests.

Recommended model: `gpt-6.1-sol` high. Although the code change may be small,
security boundary design and cross-platform test coverage require careful
reasoning.

## Worker file-lock failure

The successful image conversion test fails during teardown with `EBUSY` while
removing a generated WEBP file on Windows. This may be a Sharp/libvips handle
lifecycle issue or timing-sensitive test cleanup. It is not yet evidence of
incorrect image output, but it prevents a reliable test baseline and must be
reproduced under Node 24 before deciding whether code or test cleanup owns the
fix.

## Formatting baseline

Prettier reports 52 files. The list spans source, configuration, documentation,
templates and package manifests, so this is repository baseline debt rather
than one isolated module failure. A formatting-only package is appropriate,
but it must avoid overlapping active frontend work without coordination.

Recommended model: lower-cost model for the mechanical formatting package,
after the touched-file boundary is agreed.

## Required next checks

After Node 24.18.0 and Docker are healthy:

1. perform a frozen-lockfile install or prove the existing installation;
2. run quality commands from a clean checkout without prebuilt `dist`;
3. reproduce and fix the Worker security and file-lock failures;
4. run unit and coverage suites to completion;
5. validate Prisma and apply migrations to a disposable database;
6. run API E2E and Web E2E;
7. regenerate and verify GraphQL artifacts;
8. run the production build;
9. run architecture, license and dependency checks;
10. verify the same sequence in CI.

The root `quality` command should then become equivalent to the accepted local
gate or delegate to one canonical script that is also used by CI.
