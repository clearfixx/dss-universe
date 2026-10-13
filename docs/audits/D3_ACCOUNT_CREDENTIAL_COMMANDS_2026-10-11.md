# D3.2 — Auth-owned Credential and Account-state Commands

> Date: 2026-10-11. Branch: `debt/d3-auth-identity-boundary`.
> Increment from `5acbd88`; full D3.2 remains incomplete.

## Ownership change

Deactivation, reactivation, email changes and password-hash changes now use the
Auth-owned `AccountCredentialsRepository`. Its command-only contract takes opaque
subject IDs and credential values, returns no profile/ORM record and exposes no
transaction client. The Prisma adapter owns guarded writes, session revocation,
access-version changes and audit in the same transaction. Historical audit action
names and alert timing are preserved.

The four operations were removed from UsersRepository and PrismaUsersRepository,
not retained behind a facade. Their sole production consumer was AuthService.
The unused legacy Users `updateRefreshTokenHash` operation and stale test stub were
also removed; current refresh-token rotation uses device sessions.

Users no longer needs AuditWriterService for these operations. Registration still
uses its transitional create operation and includes the password hash; reading
credentials through Users and profile mapping inside Auth are not yet fixed.
No complete ownership isolation or reduced architecture finding count is claimed.

## Security invariants

- Email/password changes require current ACTIVE state, increment authVersion,
  clear the legacy refresh hash and revoke outstanding device sessions.
- Email changes clear verification; password hashes are not included in audit.
- Deactivation now requires current ACTIVE state inside the update. A stale
  self-deactivation cannot replace BANNED with DEACTIVATED and enable reactivation.
- Reactivation requires DEACTIVATED; previously revoked sessions are not restored.
- Updates select only the ID and expose no database record to application callers.
- Audit and revocation errors reject the transaction rather than returning success.

The stale-state test is a deterministic sequential interleaving, not a concurrent
load proof. Wider credential-check/state-change races remain part of final D3
security acceptance; this increment does not claim all concurrency issues solved.

## Verification

- Targeted unit tests: 20 passed across Auth orchestration, command adapter and
  remaining Users repository tests. Old Users-owned transition tests were replaced
  by 7 Auth-owned adapter tests, including state/revocation/audit failure paths.
- Full API unit suite: 76 suites / 334 tests passed; 1 suite / 3 tests skipped.
- Real PostgreSQL / AppModule E2E: 7 selected tests passed, 9 unselected skipped,
  20.128 seconds. Includes real transaction rollback after injected audit failure,
  unchanged credential/version/session snapshot and continued validity of the old
  access token; BANNED state preservation and authentication denial; REST profile
  allowlist; GraphQL registration, account/credential transitions and sessions.
- Prisma validation and frozen 156-finding architecture baseline pass.
- Architecture/licence checks and 28 analyzer fixtures pass.
- Final lint and typecheck: 9 tasks successful each (API fresh, 8 cached).
- Final build: 6 tasks successful (API fresh, 5 cached).
- Changed-file Prettier and `git diff --check` pass.

No frontend, dependency, migration or schema changes.
Repository-wide formatting, dependency audit, Web smoke and full API E2E remain
separately tracked baseline gates, not waived by selected passing tests.

## Remaining work

Next: migrate credential reads, token display-claim composition and registration/
profile response orchestration through narrow contracts, with failure-injection
tests for registration atomicity. D3.3/D3.4 remain, then separately approved D3.5.
Phase 11 still requires its own brainstorm before implementation.

At observation, previous commit's CI run 38142301058 has failed dependency audit
and Web smoke, with main quality job pending; storage run 38142301038 passes on
Windows/Linux. This is not evidence for the unpublished increment or a green PR.
