# D3.4 — Authoritative request access

## Outcome and boundary

DEBT-043 is implemented, pending review. JWT roles and permissions remain in the
compatible token shape, but no longer authorize a request. After authoritative
session validation, Core Auth reads current access through RequestAccessReader.
Root identity composition connects that consumer port to the Authorization-owned
SubjectAccessReader. Auth application logic does not import IAM assignments or
Users profiles. Explicit allowlisted array copies cross the boundary; named
exports and File Passport 3.1 headers are used.

The resulting principal supplies existing REST/GraphQL guards and services.
Authority errors propagate without JWT fallback or positive access caching.
This adds an authoritative database read to authenticated requests. Access is a
per-request snapshot: this change does not cancel already running commands or
claim transaction-wide revocation guarantees.

## Evidence

- Before the correction, the new real REST test revoked a direct grant through
  IAM and reused the same token: expected 403, received 200.
- Four real E2E tests pass: direct grant/revoke/rename/delete, role permissions
  and membership changes including overlapping direct grants, authority failure
  denial, and existing GraphQL achievement administration grant/revoke.
- Seven focused unit tests pass, including no access read after session denial,
  repeated fresh reads, copied allowlisted fields and propagated authority errors.
- Full uncached units with DB/Redis opt-ins: API 481, Web 59, Worker 36 pass.
- Lint, typecheck, build and Prisma validation pass. Architecture fixtures: 28
  pass; reviewed inventory remains 143 findings.
- Full API E2E: 44 passed, two failed, 114.253 seconds. Leaderboard fixture
  contamination and focused News assertion/cleanup failures are DEBT-045; the
  full gate is not accepted. Focused request-access E2E: four pass in 9.013 seconds.

No schema, migration, dependencies, public API, GraphQL operations or frontend
changes are included. Root formatting, dependency audit, generated GraphQL drift,
broader E2E and required CI remain separate unresolved acceptance gates.

IAM role/assignment persistence work remains. D3.5 and Phase 11 are not started.
