# D3 — Auth, subject and IAM boundaries

Auth previously loaded Users profiles and exposed persistence/infrastructure
details in application services. This change gives Auth owned contracts for
credentials, sessions, recovery, verification, abuse counters, second factors and
delivery. Registration and profile-bearing responses are assembled by explicit
identity composition; public response and legacy token shapes remain compatible.

The second-factor lifecycle serializes mutations on the subject, including first
setup. Disable checks current credentials and factor proof inside the same
transaction as recovery-use audit, factor removal and session revocation. A failed
audit leaves both the factor and recovery code usable for a valid retry.

IAM permission management now uses its own repository and explicit permission
record. Creation and audit stay atomic; ORM clients never cross its private port.
Roles and subject assignment remediation remains in progress.

Authenticated requests now read current roles and permissions through narrow
consumer ports joined in root composition. Revoked JWT grants cannot authorize
subsequent requests; authority failures deny access without token fallback.

## Validation and review limits

- Full uncached units: API 481 with explicit DB/Redis opt-ins, Web 59, Worker 36.
- Selected real API E2E: IAM permission CRUD/denial/rollback, login lock,
  password recovery and second-factor rollback/retry pass.
- Changed-file formatting, lint, Prisma validation, typecheck and build pass. Architecture fixtures pass;
  reviewed inventory decreased from 156 at D2 to 143 known findings.
- Source headers follow File Passport 3.1; exports added here are named.
- Root formatting, dependency audit, full API/Web E2E and final CI acceptance
  remain unresolved baseline gates. This PR stays draft and must not be merged
  while required checks are red.
- Four same-token request-access E2E cases pass, covering REST/GraphQL,
  direct/role grant changes and fail-closed authority errors (DEBT-043).
- Full API E2E: 44 passed, two failed. Shared leaderboard fixtures and News
  assertion/cleanup drift are tracked separately in DEBT-045.
- GraphQL consistency also remains red: generated barrel comment drift is
  recorded in DEBT-044. Schema and operations are unchanged.

No schema migrations, dependency changes or frontend redesign are included.
D3.5 generic groups/Premium and Phase 11 implementation are outside this PR.

Detailed evidence: [D3 progress](D3_PROFILE_BOUNDARY_PROGRESS_2026-10-11.md),
[IAM persistence](D3_4_IAM_PERMISSION_PERSISTENCE.md),
[atomic second-factor lifecycle](D3_4_TWO_FACTOR_ATOMIC_LIFECYCLE.md),
[authoritative request access](D3_4_AUTHORITATIVE_REQUEST_ACCESS.md).
