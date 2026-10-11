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
