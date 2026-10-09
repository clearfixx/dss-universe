# DSS Universe — File Passport Audit

> Status: Static audit complete; remediation not started
>
> Date: 2026-10-10
>
> Canonical source reviewed: `docs/architecture/file-passport.md`

## Decision summary

The File Passport standard is active and applies to every authored source file,
including tests, DTOs, barrel files and architectural placeholders. Small files
may use the Minimal Passport. README files are explicitly outside this rule.

The repository is not currently compliant. A first-pass scan of tracked
TypeScript, TSX, JavaScript-module and Prisma source candidates found 248 files
without `DSS Universe` in their first 35 lines out of 787 candidates (68.6%
apparent coverage). This is a discovery count, not a migration manifest:
generated files and configuration files must be classified before enforcement.

Mass insertion is not approved. The specification itself asks for gradual,
module-sized migration and truthful Passports rather than a repository-wide
comment rewrite.

## Canonical requirements

The reviewed specification requires:

- the Passport to precede implementation;
- a full project-relative path in the `File` field;
- the Official Template for substantial files;
- the Minimal Template for genuinely small files;
- Passports for tests, barrel files and placeholders;
- architectural purpose and owned responsibilities, not line-by-line behavior;
- updates whenever meaningful refactoring changes the file's intent;
- one canonical format, with no local variants.

Generated files need an explicit policy. Adding a hand-written Passport to
generated output is unstable unless the generator owns that header.

## Scan method and limitations

The scan used tracked files returned by `rg --files` with `.ts`, `.tsx`, `.js`,
`.mjs`, `.cjs` and `.prisma` extensions. A file was counted as apparently
compliant when `DSS Universe` occurred within its first 35 lines.

This method intentionally does not claim semantic compliance. A present header
may be stale, may contain the wrong path, or may describe responsibilities that
the implementation no longer owns. Those checks require module-by-module
review.

## Repository-level results

| Root       | Candidates | Missing marker | Apparent coverage |
| ---------- | ---------: | -------------: | ----------------: |
| `apps`     |        774 |            243 |             68.6% |
| `packages` |         13 |              4 |             69.2% |
| `scripts`  |          2 |              1 |             50.0% |
| **Total**  |    **787** |        **248** |         **68.5%** |

The earlier 247 figure excluded Prisma. `apps/api/prisma/schema.prisma` adds one
candidate. The specification contains a Prisma-specific mission-message
example, but does not state clearly whether the Passport comment syntax is
mandatory for `.prisma`; this must be resolved before the schema is included in
an enforced denominator.

For the 786 TS/TSX/module-JS candidates, 247 lack the marker.

## Backend and worker results

| Scope                         | Missing marker |
| ----------------------------- | -------------: |
| API authored `src` candidates |            131 |
| API test candidates           |              4 |
| Worker `src` candidates       |             11 |
| Worker test candidates        |              7 |

The largest API concentrations are:

| Area/module        | Missing marker |
| ------------------ | -------------: |
| News               |             47 |
| Auth               |             20 |
| Core database      |              9 |
| Core config        |              8 |
| Interactions       |              8 |
| Core audit         |              6 |
| Core queue         |              6 |
| Core Auth          |              5 |
| Activity           |              3 |
| Core cache         |              3 |
| Core observability |              3 |
| Media              |              2 |

These counts show that missing Passports are concentrated in recently changed
areas as well as foundational code. They do not prove that files with headers
have truthful or correctly scoped Passports.

## Frontend results and coordination boundary

The Web application has 76 missing markers among 131 candidates. Three files
under `apps/web/src/gql` are generated GraphQL artifacts and must not be edited
manually. Framework-generated files such as `next-env.d.ts` also require an
explicit exclusion.

No frontend source is changed by this audit. Passport remediation in Web must
be coordinated with the separate frontend work and should not alter visual or
interaction design.

## Package and tooling results

Missing markers were found in:

- `packages/eslint-config/base.mjs`;
- `packages/jobs/src/index.ts`;
- `packages/jobs/eslint.config.mjs`;
- `packages/editor/eslint.config.mjs`;
- `scripts/check-architecture.mjs`.

Whether tool configuration files are source files under Rule 1 is currently
ambiguous. Authored executable scripts should be included. Generated output and
framework-owned declarations should be excluded.

## Specification defects

The canonical document is internally inconsistent:

1. Its top-level version is 3.0, while a separate v3.1 section is appended near
   the end instead of being integrated into one versioned specification.
2. The Official Template opens a TypeScript code fence without closing it
   before the following prose, which breaks rendered structure.
3. Rule 1 says “every source file” with no exceptions, but generated files,
   framework-owned declarations, configuration files and Prisma schema files
   are not classified.
4. The document says there must be one official specification, while older
   references still mention File Passport v2.

Enforcement should not be added until these ambiguities are resolved.

## Proposed remediation sequence

1. Repair and version the canonical specification.
2. Define machine-readable inclusion and exclusion rules.
3. Add a report-only checker and freeze its baseline.
4. Require compliant Passports for newly authored files immediately.
5. Migrate backend modules in architectural order: Auth boundaries, core
   infrastructure, worker, Interactions, News, then remaining modules.
6. Coordinate the Web migration separately and never edit generated output.
7. Tighten the checker from baseline/report mode to changed-files enforcement,
   then eventually repository-wide enforcement.
8. During each module migration, verify purpose, path and responsibility—not
   merely marker presence.

Recommended model: `gpt-6.1-sol` high for specification repair and semantic
module review. A lower-cost model is appropriate for mechanical insertion only
after templates, scope and per-file intent are frozen.

## Acceptance criteria for Package D5

- one unambiguous, correctly rendered canonical specification;
- documented inclusions and exclusions;
- generated files protected from manual edits;
- report-only baseline committed and reproducible;
- every new or materially changed authored file checked;
- module-by-module migration reviewed for truthful paths and responsibilities;
- architecture checker and CI enforce the approved policy;
- no frontend behavior or design changes introduced by the migration.
