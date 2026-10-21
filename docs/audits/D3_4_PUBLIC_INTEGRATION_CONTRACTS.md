# D3.4 — Auth/IAM public integration contracts

Date: 2026-10-12. Implementation evidence, not D3 release acceptance.

IAM's only production consumers use `IamModule` for assembly and
`REGISTRATION_ROLE_NAME` for registration composition. Its root now publishes
exactly those named symbols. Four wildcard exports were removed, not replaced
by a broad facade. Controllers, DTOs, safety services and repositories stay
internal. Nest no longer exports the four concrete IAM services.

Auth explicitly publishes its assembly module; identity presentation imports it
through the public root. Narrow business contracts and the separate presentation
entry point remain unchanged. Internal IAM slice barrels remain private assembly.

AST regressions pin both named root surfaces. A metadata regression pins IAM's
empty Nest provider-export surface. Audit's test-only lookup still works.

## Verification

- Uncached units with all Auth/IAM DB/Redis opt-ins: API 104 suites / 525 tests,
  Web 59 tests, Worker 36 tests; all pass.
- Authorization and Audit HTTP E2E: two suites / 10 tests pass.
- Lint, typecheck, Prisma validation and monorepo build pass.
- Architecture tests: 30 pass. Frozen inventory: 136, down from 140 by removing
  exactly four resolved IAM wildcard identities, with no new waivers.
- No schema, migration, dependency, generated GraphQL or frontend changes.

Root formatting and broader CI/E2E baseline debts remain acceptance blockers.
Usable-administrator lifecycle acceptance and D3.5 remain open. The stacked PR
stays draft; required red checks prohibit merging.
