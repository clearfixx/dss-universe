# D3.2 legacy token-claims composition

Date: 2026-10-11. Status: production boundary increment, not full D3.2 completion.

## Why this precedes registration transfer

The existing TokenService required `username` from Auth, so completing
registration/session issuance without a profile would retain that ownership
leak. An Auth-owned `AccessTokenIssuer` contract now accepts only opaque ID,
email and access version, plus session ID. Auth no longer passes username or
loads effective permissions for token issuance. Its refresh verification type
likewise contains only subject/session/version, not an access-profile aggregate.

Root-installed IdentityCompositionModule supplies the legacy adapter. It
combines Auth facts, the public Users `ProfileDisplayReader` scalar contract and
the existing Authorization access-profile authority. The Users adapter selects
exactly username; it does not return an ORM row, credential hash or status.
Only the narrow issuance token is globally visible. Auth imports no composition
module, avoiding a circular feature/root wiring dependency.

The composition adapter signs existing access claims with the existing secret
and 15-minute lifetime. Refresh signing remains owned by Auth with its existing
secret and seven-day lifetime. Missing profile, provider failure or missing
configuration cannot yield a successful token pair. Storage failures propagate;
there is no fallback display identity or positive security cache. Immediate
session/state/version checks remain authoritative on every authenticated request.

## Compatibility and remaining scope

REST/GraphQL models and JWT field names are unchanged. Exact JWT payload keys
and lifetimes are checked through real registration/login/refresh responses.
The Auth issuance boundary explicitly reconstructs its three fields, so runtime
extras cannot sneak through a TypeScript structural type. Adapter tests also
verify exact signed claims despite extra runtime subject fields.

Auth still uses UsersRepository/UserMapper for registration and combined profile
responses. Those dependencies are not hidden behind this port and remain open.
Registration orchestration and presentation must still move outside Auth/Users,
preserving the characterized transaction/session/mail failure boundaries.
Authorization's existing core service remains behind composition; its subsequent
contract review is D3.4, not an implementation of groups or Premium.

No frontend, dependency, schema, migration, provider or environment changes.
The report-only architecture inventory remains 155 findings; its unchanged
count is not proof of completed isolation. No existing finding is waived.

## Verification

- API unit tests: 353 passed, three skipped; 79 suites passed, one skipped.
- Eleven selected real API E2E passed, nine unselected skipped (18.911 seconds).
  Exact access/refresh JWT keys, identity/session/version and 15-minute/seven-day
  lifetimes are checked on REST registration/login/refresh. Existing GraphQL,
  immediate revocation and registration failure-boundary cases also pass.
- Lint/typecheck: nine successful tasks each; API fresh, eight cached.
- Build: six successful tasks; API fresh, five cached.
- Prisma validation, 28 architecture fixtures and the unchanged 155-finding
  baseline check pass. No root-composition compliance claim beyond this bounded
  static analyzer: imports were also reviewed against published contracts.
- Unit coverage includes missing profile, profile/access authority failures,
  missing signing secrets, exact selected fields, runtime extra-field exclusion,
  refresh identity allowlisting and absence of a successful pair after failure.

CI observation on the preceding 032dd26 commit: Quality Gate 38144047462 has
failing Dependency audit and Web smoke; the main quality job was pending at
observation. Storage containment 38144047456 passed Ubuntu and Windows. Those
are not results for this increment. Existing global formatting/full E2E debts
remain; no red PR merge or Phase 11 start is requested.

Changed-file formatting and diff whitespace checks pass. Repository-wide
Prettier still reports the known 41 files; no bulk cleanup performed.
