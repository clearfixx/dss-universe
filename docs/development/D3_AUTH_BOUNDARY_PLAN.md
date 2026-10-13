# D3 — Auth / Identity Boundary

> Started: 2026-10-11. Implementation branch: `debt/d3-auth-identity-boundary`.
> Direction approved in ADR-003; completion is incremental, not implied by D3.1.

## Objective

Auth owns credentials, sessions and account eligibility using opaque subject IDs.
Users owns profiles. Cross-domain registration and presentation use explicit
composition and narrow ports. Preserve current API compatibility and immediate
revocation; no new tables are required by the approved direction.

## Sequence

1. **D3.1 Access-session validation**: move authoritative session/account-state
   persistence access out of core JWT strategy into an Auth-owned adapter.
   Core consumes an explicit session-validation capability. Verify malformed
   claims, owner mismatch, expiry, revocation, account state and auth version.
2. **D3.2 Credentials, registration and presentation**: remove profile knowledge
   from Auth application logic; compose registration and existing profile-bearing
   responses outside Auth through narrow contracts.
3. **D3.3 Auxiliary Auth boundaries**: review abuse controls, audit and recovery
   dependencies without silently expanding responsibilities.
4. **D3.4 IAM/account-state integration and acceptance**: replace remaining
   ownership leaks, validate security regressions and reconcile the inventory.
5. **D3.5 Groups/Premium**: separately approved scope; not automatically part of
   this refactor or permission to implement new product functionality.

Each step requires evidence and review. D3.1 does not close the whole Auth debt.
The [D3.2 field/operation inventory](D3_2_FIELD_AND_OPERATION_INVENTORY.md)
records current ownership, migration targets and the first safe-profile fix.
Existing JWT profile fields remain for compatibility during D3.1; their future
presentation contract is a D3.2 decision, not a hidden token-format change.

## D3.1 invariants

D3.2 registration/presentation transfer is implemented; see
[current evidence](../audits/D3_REGISTRATION_PRESENTATION_COMPOSITION_2026-10-11.md).
Auth no longer depends on Users. The reviewed frozen inventory is now 148
findings, down from the original 156; outstanding findings are not waived.
D3.3 auxiliary dependencies are next, not Phase 11 or implicit D3.5 approval.

The first D3.3 increment transfers password recovery persistence to an Auth-owned
port and verifies real reset concurrency/rollback plus GraphQL revocation/replay.
See [recovery evidence](../audits/D3_3_RECOVERY_BOUNDARY_2026-10-11.md).
Current frozen inventory is 147. Other auxiliary dependencies remain open.

The following D3.3 increment transfers login-abuse SQL/audit transactions to an
owned repository and proves real concurrency/rollback plus HTTP lock behavior.
See [login-abuse evidence](../audits/D3_3_LOGIN_ABUSE_BOUNDARY_2026-10-11.md).
Current inventory is 146; verification, 2FA and infrastructure ports remain open.

The next D3.3 increment isolates verification persistence and verifies real
single-use consumption/rollback plus GraphQL state/audit/replay denial.
See [verification evidence](../audits/D3_3_EMAIL_VERIFICATION_BOUNDARY_2026-10-11.md).
Current inventory is 145; 2FA and infrastructure capability review remain open.

The second-factor persistence transfer is implemented through an owned port with
locked confirmation, one-use recovery and transactional revocation/audit tests.
See [2FA evidence](../audits/D3_3_TWO_FACTOR_BOUNDARY_2026-10-11.md).
Current inventory is 144. Infrastructure review remains. The owner approved
DEBT-042 as a separate D3.4 package: atomic proof/mutation under a subject lock,
deterministic concurrency tests and unchanged public API. The correction is now
implemented; see [atomic lifecycle evidence](../audits/D3_4_TWO_FACTOR_ATOMIC_LIFECYCLE.md).
Broader D3.4 acceptance and baseline quality debts remain open.

Security-alert delivery now uses a private Auth capability rather than the broad
queue registry. See [delivery evidence and remaining matrix](../audits/D3_3_SECURITY_ALERT_DELIVERY.md).
Recovery/verification delivery is now isolated through separate owned capabilities;
see [queue boundary evidence](../audits/D3_3_RECOVERY_VERIFICATION_DELIVERY.md).
Recovery/verification counters now use owned attempt-budget capabilities; see
[Redis evidence](../audits/D3_3_RECOVERY_VERIFICATION_RATE_LIMITS.md).
Login-abuse Redis counters now use a private owned capability; see
[login counter evidence](../audits/D3_3_LOGIN_ABUSE_COUNTER.md).
IAM/public-contract review and broader D3 acceptance remain open.

IAM permission persistence now uses a private owned repository with atomic creation
audit; see [IAM evidence](../audits/D3_4_IAM_PERMISSION_PERSISTENCE.md). The reviewed
inventory is 143. Roles/access persistence and public contracts remain open.
DEBT-043 records stale JWT-derived permissions after IAM revocation; authoritative
access decisions need a separate D3.4 security increment before acceptance.

- The JWT strategy sees subject ID, session ID and auth version for eligibility.
- Each request reads authoritative state; no positive security cache.
- Missing/revoked/expired sessions, inactive accounts, mismatched owners or
  versions cannot produce an authenticated principal.
- Storage failures never produce a successful principal.
- The adapter selects only session ownership/expiry/revocation and account
  status/version, not profile or credential hashes.
- Auth composes the strategy and capability; core imports no feature module.
- No schema, migration, dependency or frontend changes.

## Verification and known baseline

Final acceptance is explicitly unproven in the
[D3 acceptance matrix](../audits/D3_ACCEPTANCE_REVIEW.md): real registration
rollback evidence needs characterization and full repository/CI gates remain red.
The [D3.5 brainstorm](D3_5_ACCESS_GROUPS_BRAINSTORM.md) is design-only, awaiting
scope and mutation-authority decisions; it does not start implementation.

2026-10-13: the final static D3 finding (bcrypt namespace import) is removed with
named hash/compare imports and two real-library tests. API 527, Web 59, Worker 36
units and 10 HTTP E2E pass; lint, typecheck, Prisma validation, build and architecture
checks pass. Inventory is 135, entirely D4. Full quality/CI and security acceptance
remain open. See [evidence](../audits/D3_4_EXPLICIT_BCRYPT_IMPORTS.md).
New owner/Command Deck features stay in their relevant phases under the latest
[owner direction](COMMAND_DECK_OWNER_DECISIONS.md); do not implement the superseded
six-key DEBT-047 proposal.

Administrator-availability review at `c9659e0` identifies DEBT-047: protected
assignment count does not ensure eligible recovery-capable administration.
Self-deactivation and critical permission changes need a separately agreed
cross-owner policy, not an Auth-to-IAM dependency. Static evidence and proposed
acceptance tests are in [review](../audits/D3_4_ADMINISTRATOR_AVAILABILITY_REVIEW.md).
No corrective runtime implementation is included; D3 remains unaccepted.

D3.4 public contract follow-up (2026-10-12): IAM exports only assembly and
registration policy, with no concrete Nest provider exports. Auth assembly uses
its named public root. API 525 units, Web 59, Worker 36, 10 Authorization/Audit
HTTP E2E and 30 architecture tests pass; lint, typecheck, Prisma validation and
build pass. Inventory is 136 after removing four resolved IAM wildcard identities.
D3 acceptance remains open. See [evidence](../audits/D3_4_PUBLIC_INTEGRATION_CONTRACTS.md).

Subject-assignment persistence is now isolated behind a private IAM repository;
the service owns summary/union policy and retains the separate protected role
revocation capability. API 524 units and eight real authorization E2E pass.
Exactly one resolved database import was removed: reviewed inventory is 140.
Public contracts, usable-administrator lifecycle and D3 acceptance remain open.
See [assignment evidence](../audits/D3_4_IAM_SUBJECT_ASSIGNMENT_PERSISTENCE.md).

DEBT-046's approved last privileged role-holder protection is now implemented
through a private role-locked IAM capability and existing application policy.
Seventeen service/DB tests and seven HTTP/GraphQL E2E cases pass, including actual
concurrent lock barriers. See [security evidence](../audits/D3_4_LAST_ADMIN_REVOCATION_REVIEW.md).
General subject-assignment persistence and broader usable-administrator lifecycle
acceptance remain open; this capability must not be bypassed during the transfer.

IAM role persistence is isolated through a private port and adapter; safety
rules and response behavior remain unchanged. Fifteen service/DB tests and five
real authorization/role E2E cases pass. The reviewed inventory is now 141 after
removing exactly two resolved RolesService persistence imports. Subject
assignment persistence and public contracts remain open.
See [role evidence](../audits/D3_4_IAM_ROLE_PERSISTENCE.md).

D3.4 request access now refreshes roles and permissions after authoritative
session validation through narrow Core Auth/Authorization ports and root
composition. Four same-token REST/GraphQL E2E cases pass; DEBT-043 is implemented
pending review. IAM role/assignment persistence remains in progress. Full E2E
fixture/News failures are tracked in DEBT-045, not silently fixed in this package.
See [request access evidence](../audits/D3_4_AUTHORITATIVE_REQUEST_ACCESS.md).

Run focused unit and real GraphQL/session E2E tests, full API units, lint,
typecheck, Prisma validation, build and architecture gates. Preserve the frozen
156-finding feature inventory; core persistence was a manually tracked debt
outside that inventory, so D3.1 need not reduce its number.

D2 Quality Gate run 38083005484 passed lint, typecheck, unit coverage and
architecture checks, but its API E2E step exhausted the six-hour job limit.
Dependency audit and Web smoke were also red; build was skipped. Focused storage
run 38083005488 passed Windows and Linux. These are unresolved baseline facts,
not grounds to claim release acceptance or merge a red PR.

See [owner product vision](PRODUCT_VISION_1_0.md) for corrected names and scope.
Product reconciliation is separate from this security-boundary refactor.
