# D3 — Registration PostgreSQL atomicity

Date: 2026-10-13. Verification package, no new product behavior.

## Correction to the acceptance review

The previous review inferred missing real rollback evidence from a mocked spec.
That conclusion was incomplete: `app.e2e-spec.ts` already contains real rollback
after role-assignment SQL, username-conflict coverage and denial of a minted
token after session persistence fails. Those tests were inspected and rerun.
The new suite strengthens isolation and concurrency coverage, rather than
replacing nonexistent evidence. No production defect was found.

## New eight-test PostgreSQL suite

`prisma-registration-transaction.integration.spec.ts` uses the production adapter
in a random schema with copied tables, matching foreign keys and status enum.
Only the suite's schema is dropped; public seeds/accounts are untouched.

- Successful commit copies only intended profile/credentials, assigns the baseline
  role and returns an opaque ID; caller mutation and forged role input do not leak.
- Missing baseline leaves no subject, assignment or session.
- AFTER INSERT triggers fail after subject and assignment inserts. Both writes
  roll back, baseline role remains, and retry succeeds after removing the failure.
- Concurrent duplicate email and username attempts leave exactly one complete
  registration. These prove uniqueness outcomes, not a specific lock schedule.
- Real Auth enrollment/hash/credential reads and presentation composition run
  against both DB failures. Instrumented token/session/mail/profile boundaries
  are never called; actual DB session count is zero.

The first focused run exposed a missing enum in the isolated test fixture. The
fixture was corrected; production schema/implementation were not changed.

## Boundary and verification

Profile/credentials share the users row and commit atomically with assignment.
Session issuance and verification delivery remain post-commit. The existing E2E
proves session failure leaves the committed account but the minted token cannot
authenticate without a persisted session; subsequent login recovers access.
This is not a new transaction spanning token signing or external mail delivery.

- Full uncached units with all Auth/IAM DB/Redis opt-ins: API 106 suites / 535
  tests, Web 59 and Worker 36 tests pass.
- Four focused existing registration E2E pass; 22 unrelated tests skipped.
- Five-test selection twice yielded four passes and a timeout in the broad
  GraphQL-registration scenario, including a rerun without parallel gates. It
  combines many unrelated flows under a five-second timeout. DEBT-048 records
  this; full E2E is not green. No timeout/expectation was weakened.
- Lint, typecheck, Prisma validation, build, architecture/license and baseline
  checks pass. Inventory unchanged: 135 D4 findings, no D3 static findings.
- Changed formatting/diff checks pass. Root formatting, audit, generated-output,
  broad E2E and CI acceptance debts remain open.
- No production source, schema, migration, dependency or frontend changes.

D3 overall remains unaccepted; this report proves the bounded registration
contract, not all repository quality gates or future owner policy.
