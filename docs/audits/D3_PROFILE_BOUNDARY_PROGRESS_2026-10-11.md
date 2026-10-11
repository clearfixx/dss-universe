# D3 — Session and Profile Boundary Progress

> Branch: `debt/d3-auth-identity-boundary`, stacked on D2.
> Status: partial D3 implementation; not ready for release acceptance or merge.

## Changes

D3.1 isolates authoritative session validation from the core JWT strategy.
Evidence: [D3.1 report](D3_1_ACCESS_SESSION_BOUNDARY_2026-10-11.md).

The next D3.2 prerequisite is implemented: UserMapper now constructs the exact
16-field existing SafeUser contract, rather than copying every field except two
hashes. The previous runtime object included authVersion, deactivation and lockout
state and could copy arbitrary future secrets. Three regression tests failed
before the fix and pass afterward. No claim of existing password-hash disclosure
or proven external exploitation is made.

REST register/login/refresh now exclude undeclared internal extras, including
attachment relation IDs. Supported profile fields and token pairs are preserved.
GraphQL schema and frontend are unchanged by this increment. This is a deliberate
safe-contract correction, not byte-for-byte compatibility with leaked extras.

The [field/operation inventory](../development/D3_2_FIELD_AND_OPERATION_INVENTORY.md)
maps credentials, eligibility, profile, registration transaction, transport and
legacy token claims. Full D3.2 composition is not yet implemented; Auth still
imports Users internals. No universal facade or duplicate identity was introduced.

## Verification of this increment

- API unit tests: 75 suites / 329 tests passed; 1 suite / 3 tests skipped.
- Real API E2E: 5 selected tests passed, 9 unselected skipped, 14.428 seconds.
  Includes exact REST profile keys through registration/login/refresh, GraphQL
  registration/viewer, deactivation/reactivation, credential changes and sessions.
- Lint and typecheck: 9 successful tasks each; API fresh, 8 cached.
- Build: 6 successful tasks; API fresh, 5 cached.
- Prisma schema validation passed; no schema/migration/dependency changes.
- Architecture check, 28 analyzer fixtures and frozen 156-finding baseline pass.
- Changed-file formatting and diff whitespace checks pass. Repository-wide
  formatting remains red on the known 41 files; no bulk cleanup performed.

## CI and remaining work

Observed D3.1 CI run 38141775550 passes architecture, Prisma/migrations, lint,
typecheck and unit coverage. Dependency audit and Web smoke fail. API E2E remains
running at observation; no completion claim. Ubuntu and Windows storage
containment pass. These observations apply
to the earlier D3.1 commit, not automatically to the new profile fix.

Full quality acceptance remains red. Existing DEBT-016/034/038 and formatting
debts are not waived. No merge is requested. Next work is the D3.2 narrow credential
and registration/presentation composition described in the inventory, followed
by D3.3/D3.4 and separately scoped D3.5. Stop before Phase 11 for its brainstorm.
