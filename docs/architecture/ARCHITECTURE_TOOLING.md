# D2 — Architecture inventory and enforcement design

Status: report-only review inventory, 2026-10-10; not release acceptance.

## Files and responsibilities

- `scripts/architecture/analyze-boundaries.mjs`: pure TypeScript AST inventory.
- `scripts/architecture/find-dependency-cycles.mjs`: deterministic Tarjan SCCs.
- `scripts/architecture/report-boundaries.mjs`: read-only filesystem/CLI adapter.
- `scripts/architecture/analyze-boundaries.test.mjs`: allowed/forbidden fixtures.
- `docs/architecture/architecture-baseline.json`: reviewed-shape, frozen D2 debt
  inventory. JSON has no comment Passport; this document describes its ownership.

The compiler is resolved from the API's declared TypeScript dependency. No new
dependency or reliance on an accidentally hoisted root compiler is introduced.

## Commands

| Command                                                  | Meaning                                                                          |
| -------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `pnpm test:architecture`                                 | Rule and baseline-drift fixture tests                                            |
| `pnpm architecture:report`                               | Inventory; exits zero even with known findings                                   |
| `node scripts/architecture/report-boundaries.mjs --json` | Machine-readable report                                                          |
| `pnpm architecture:baseline`                             | Fails on added **or removed** inventory identities                               |
| `pnpm architecture:check`                                | Existing blocking subset/licenses, new fixture tests, then report-only inventory |

An added forbidden fixture produces baseline drift against an empty baseline;
matching known debt is **not** compliance. Removed entries require review too so
the evidence records real remediation, not hidden exclusions. The CLI never writes
or expands the baseline. `--check-baseline` prints each added/removed identity and
exits nonzero on drift. Unsupported options and parsing failures are visible.
The baseline check is an explicit local review guard in D2, not yet a new CI
compliance gate. D4 owns promotion to blocking rules as debt is closed.

## Scope and rules

Only authored `.ts`/`.tsx` under API `src/modules` and `src/core` are scanned.
Tests and declarations are excluded. Relative imports and the current `@api/`
alias are normalized with portable paths. Static imports/exports, import types,
literal dynamic imports/require and import-equals dependencies are inspected;
comments and arbitrary strings are not parsed as imports.

| Rule                                        | Signal                                                            | Initial count |
| ------------------------------------------- | ----------------------------------------------------------------- | ------------: |
| `wildcard-export`                           | `export *` and namespace re-exports                               |            83 |
| `namespace-import`                          | Namespace imports, including external libraries                   |             2 |
| `concrete-public-export`                    | Root named exports ending Service/Mapper or starting Prisma       |            17 |
| `foreign-concrete-service`                  | Foreign named Service/Mapper imports/re-exports                   |            18 |
| `foreign-private-import`                    | Cross-feature deep dependency; module wiring exception only       |            16 |
| `persistence-outside-infrastructure`        | Feature non-infrastructure Prisma/database import                 |            20 |
| `domain-outer-layer`                        | Domain imports application/presentation/infrastructure            |             0 |
| `core-feature-import`                       | Core imports a feature module                                     |             0 |
| `module-cycle`                              | Strongly connected feature dependency group, including type edges |             0 |
| `parse-error` / `unresolved-dynamic-import` | Analysis gaps needing review                                      |             0 |

156 rule/file/dependency diagnostics are not 156 independent vulnerabilities.
One edge can trigger several rules. The inventory is deduplicated, sorted and
identified by `[rule, normalized file, detail]`, not unstable line numbers.
Auth/IAM findings map to D3 (20); remaining findings map to D4 (136). These labels
are work allocation, not proof that each item is fully fixed by that package.

## Limits and manual review

This is syntactic analysis, not a TypeScript type program or module resolver.
Other aliases, package exports, transitive/local barrels, default-import symbol
renaming, arbitrary extension resolution, Nest provider/export arrays, runtime DI
and computed loaders are not completely resolved. A locally shadowed `require`
can produce a conservative signal. Concrete-name rules are heuristics; exporting
a renamed local service or non-Service broad facade still requires review.
Core database imports are not universally violations (it is infrastructure);
the JWT strategy's direct user/session persistence coupling remains a manual D3
finding even when not counted by the feature-only persistence rule.

No cycle was found **in this bounded static feature graph**. This does not certify
the complete application/Nest graph. Type-only cycles can be reported even when
they do not cause runtime DI cycles. Shared-layer rules, framework-free domain,
application-to-presentation edges, DTO responsibility, secret flow, physical IO
containment, Passport compliance and event idempotency still need deeper checks
and manual/integration review. Other apps/packages and the composition root are
not covered by this inventory. Do not equate a zero parser count with completeness.

## Closure policy

Review each rule family and representative source before accepting rule precision.
Fix production dependencies only in D3/D4 with behavior/security regression tests.
Update removed identities with evidence in a reviewed commit. Newly discovered
legacy debt gets an explicit register entry/scope decision; never auto-accept new
violations or use the baseline as a permanent allowlist. D4 should shrink the
baseline and make precise rules blocking; D6/D7 retain full runtime acceptance.
