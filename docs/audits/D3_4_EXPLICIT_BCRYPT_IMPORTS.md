# D3.4 — Explicit bcrypt imports

Date: 2026-10-13. Scope: final D3 static inventory item, not whole-D3 acceptance.

PasswordHashService now imports only `hash` and `compare`, with explicit local
aliases. Cost remains 12; asynchronous hashing and comparison behavior is
unchanged. No dependency upgrade, authentication policy change or UI work.

Two real-library regressions verify cost, matching/mismatching synthetic secrets
and independent salts. This checks installed CommonJS interoperability through
the project's TypeScript/Jest configuration, rather than mocks alone.

## Verification

- Uncached units with Auth/IAM DB/Redis opt-ins: API 105 suites / 527 tests,
  Web 59 tests and Worker 36 tests pass.
- Real Authorization/Audit HTTP E2E: two suites / 10 tests pass, including login.
- Lint, typecheck, Prisma validation and monorepo build pass.
- Architecture checks and frozen baseline pass: 135 known findings, all D4.
  Exactly the resolved bcrypt namespace-import identity was removed; no waiver.
- Changed source formatting and diff whitespace checks pass. Full repository
  formatting remains red on pre-existing files; no broad mechanical rewrite.

No schema, migration or generated GraphQL change. Broader quality debts and
DEBT-047 disposition remain open. The accepted owner/Command Deck requirements
are scheduled by phase, not implemented in this package. Zero static D3 findings
is not proof of security acceptance or a reason to merge red required CI checks.
