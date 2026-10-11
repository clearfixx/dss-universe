# D3.3 — Email-verification persistence boundary

> Branch: `debt/d3-auth-identity-boundary`, draft PR #7.
> Status: verification persistence transfer implemented; D3.3 remains open.

## Ownership and compatibility

EmailVerificationService consumes the private Auth-owned
EmailVerificationRepository port instead of PrismaService or a concrete adapter.
The adapter returns only `{ email }` for a pending active subject, never profile,
credential hashes or ORM records. Request configuration, generic success,
identity/IP limits, credential-free queue payload and best-effort registration
delivery remain unchanged. Concrete Redis/queue dependencies remain for a later
capability review; this package does not claim to close them.

Consumption retains the existing account row lock, expiry predicate, single-use
deletion, verification update and transactional audit. Credential lookup now
selects only subject ID. Resend eligibility is not silently added as a new
consume-time account-state policy. No migration, provider, JWT, schema, frontend
or dependency change is included.

## Verification

- Full API units with `RUN_AUTH_DB_TESTS=1` and `RUN_RECOVERY_DB_TESTS=1`:
  85 suites / 401 tests passed, no skips, 20.103 seconds.
- Five new isolated PostgreSQL tests cover minimal pending destination,
  inactive-account exclusion, concurrent single-use consumption, expired/missing
  tokens and rollback of deletion/state on injected audit failure. Audit is mocked
  in this suite; rollback is real SQL, not an audit-platform integration claim.
- Four selected real AppModule E2E passed / nineteen unselected skipped,
  8.629 seconds. GraphQL verification proves persisted state, actual audit record
  and replay denial; registration mail failure, login lock and password recovery
  regressions also pass. This does not prove actual SMTP delivery.
- Lint and typecheck each pass nine tasks (API fresh, eight cached).
- Build passes six tasks (API fresh, five cached); cached Web logs are not fresh
  browser/UI acceptance. Prisma validation passes.
- Architecture checks and 28 analyzer fixtures pass. Reviewed inventory matches
  145 findings, one removed, none added; remaining debt is not waived.
- Root `format:check` remains red on the same 41 known unrelated files.
  Changed files pass formatting; `git diff --check` passes.

Initial test harness lacked a schema-local UserStatus enum; it now mirrors the
public enum in its UUID-isolated schema without changing production types.
Initial GraphQL assertion used an incorrect URL; it was corrected to the existing
`/api/graphql` route. Initial lint failures in test typing were repaired without
rule suppression. These failed attempts are not counted as passing evidence.

## Remaining work

2FA and infrastructure capabilities remain D3.3 work. D3.4 integration/acceptance,
separately scoped D3.5 and subsequent debt packages remain open. Full release
gates, known root formatting, dependency audit, Web smoke and full E2E lifecycle
debts remain unresolved. Do not merge on focused results or start Phase 11 before
the agreed owner brainstorm.
