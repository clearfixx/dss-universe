# D3 — Session and Profile Boundary Progress

> Branch: `debt/d3-auth-identity-boundary`, stacked on D2.
> Status: partial D3 implementation; not ready for release acceptance or merge.

## Latest increment

[D3.3 recovery boundary](D3_3_RECOVERY_BOUNDARY_2026-10-11.md) removes direct
Prisma/concrete adapter dependencies from password recovery. Atomic reset
consumption returns only the committed notification email. Full API units with
the isolated DB suite pass (382 tests); the new GraphQL case proves immediate
revocation and replay denial. The reviewed inventory is now 147 findings.
D3.3 remains open for abuse controls, verification, 2FA and infrastructure ports.

[Registration and presentation transfer](D3_REGISTRATION_PRESENTATION_COMPOSITION_2026-10-11.md)
removes the remaining Users/profile imports from Auth. Root composition now owns
atomic shared-row enrollment and combined REST/GraphQL presentation. The reviewed
architecture inventory at that increment is 148 findings (seven removed, none added). Existing API
and JWT contracts are preserved. D3.3 auxiliary boundaries are next; overall D3
and full release acceptance remain open. DEBT-040 tracks pre-existing REST DTO
runtime validation metadata; no silent validation-policy change is included.

## Historical increments

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

Production preparation: [legacy token-claims composition](D3_TOKEN_CLAIMS_COMPOSITION_2026-10-11.md)
removes username from Auth's token input and assembles legacy display/access
claims through a root-owned adapter and a username-only Users contract.
Registration and combined response orchestration remain open.

Registration preparation: [real failure-boundary characterization](D3_REGISTRATION_FAILURE_BOUNDARIES_2026-10-11.md)
establishes atomic account/role rollback, post-commit session denial and
best-effort mail behavior before ownership transfer. This does not close D3.2.

Latest D3.2 increment: [Auth-owned credential reads](D3_CREDENTIAL_READ_BOUNDARY_2026-10-11.md).
Security reads now use a private seven-field Auth contract. AuthService no longer
imports Prisma; the reviewed architecture inventory decreases to 155 findings.
Registration and legacy profile/token presentation composition remain open.

Subsequent D3.2 increment: [Auth-owned credential/account-state commands](D3_ACCOUNT_CREDENTIAL_COMMANDS_2026-10-11.md).
Four mutations are removed from Users and implemented behind an Auth-owned port;
real database rollback and stale deactivation guards are covered. Full D3.2 is
still open; consult that increment's separate verification results.

Observed D3.1 CI run 38141775550 passes architecture, Prisma/migrations, lint,
typecheck and unit coverage. Dependency audit and Web smoke fail. API E2E remains
running at observation; no completion claim. Ubuntu and Windows storage
containment pass. These observations apply
to the earlier D3.1 commit, not automatically to the new profile fix.

Full quality acceptance remains red. Existing DEBT-016/034/038/040 and formatting
debts are not waived. No merge is requested. Next work is D3.3/D3.4 and separately
scoped D3.5. Stop before Phase 11 for its brainstorm.
