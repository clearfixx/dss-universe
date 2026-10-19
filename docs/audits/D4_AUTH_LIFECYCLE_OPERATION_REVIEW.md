# D4 — Auth lifecycle operation review

Date: 2026-10-19. Branch `debt/d4-auth-lifecycle-operation-review`, based on
`2dc275c` (draft PR #57, not accepted).

## Boundary

Source review follows six persistence adapters and their application callers:
`PrismaAuthSessionRepository`, `PrismaAccessSessionRepository`,
`PrismaLoginAbuseRepository`, `PrismaPasswordResetRepository`,
`PrismaEmailVerificationRepository`, `PrismaTwoFactorRepository`.
Context includes `AuthService`, `AuthSessionService`,
`AccessSessionValidationService`, `LoginAbuseProtectionService`,
`PasswordRecoveryService`, `EmailVerificationService`, `TwoFactorService`,
the three Redis rate-limit adapters, GraphQL session mapping and Worker
verification/recovery issuance. Account-credential persistence was reread to
trace email change and revocation. No production behavior is changed here.

The follow-up also reads all sixteen current non-test sources under Auth's
`infrastructure/repositories`, module wiring, public entry, token service and
all three queue adapters. The lexical Prisma/SQL discovery finds twelve sources;
the remaining four pure/transaction-type-only fragments are explicitly reviewed
below rather than being omitted by that search. This is still not complete
Auth/IAM reconciliation: external root consumers, remaining Auth source/policies,
IAM operations and wider Worker/transport acceptance stay in the D4 matrix.

## Operation reconciliation

All SQL delegates below are Auth-owned even where the physical table is `users`.
Core Audit is explicit transaction coordination, not a profile/role dependency.

| Adapter / operations               | Persistence and transaction behavior                                                                                                            | Contract / limit                                                                                              |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Sessions: create                   | session INSERT and `auth.session.created` Audit in one transaction                                                                              | Internal Auth session includes token hash; not a public response                                              |
| Sessions: findActive, listActive   | session ID/subject, not revoked, expiry strictly greater than current time; list creation descending                                            | No profile or IAM read; full owned row, no positive cache                                                     |
| Sessions: rotate                   | update by ID/subject/not-revoked, replaces hash and expiry                                                                                      | Previous-token proof happens in AuthService before this update; not an atomic compare-old-hash rotation claim |
| Sessions: revoke                   | updateMany for subject/session/not-revoked and conditional Audit                                                                                | Boolean result; no Audit for zero updated rows                                                                |
| Sessions: revokeOthers             | updateMany excluding current session, Audit including count in one transaction                                                                  | Expired but unrevoked sessions may also be updated; no new ACTIVE filter                                      |
| Access session: findById           | one session query selecting subject, revocation, expiry and nested Auth status/version                                                          | Returns scalar Auth state only, never hashes/profile/grants                                                   |
| Access validation                  | fresh repository read after claim shape checks; subject match, non-revoked, unexpired, ACTIVE, version match                                    | Repository failures propagate; no JWT fallback permitting access                                              |
| Login failure                      | subject row lock; reads email/counters/lock; increments attempt count and updates lock                                                          | Atomic SQL Audit only on first lock transition; mail destination returned after commit                        |
| Login success                      | reset SQL counters/lock and success Audit in one transaction                                                                                    | Redis clear occurs before SQL in application; not a distributed transaction                                   |
| Password reset consume             | token hash candidate; subject lock; ACTIVE/version match; delete token by current version/expiry; hash/version update, session revoke and Audit | Returns email after commit; invalid candidate returns null; raw reset token never persisted                   |
| Verification pending destination   | ACTIVE and not-yet-verified subject; selects email only                                                                                         | Resend eligibility is distinct from consume policy                                                            |
| Verification consume               | hash candidate; subject lock; token expiry/delete; verification timestamp update and Audit                                                      | Does not bind credential to email/version at consumption: confirmed DEBT-068                                  |
| 2FA status                         | enabledAt and recovery hashes select; returns enabled/count                                                                                     | Hash array remains inside adapter                                                                             |
| 2FA begin                          | subject lock then factor read/upsert, including no existing factor row                                                                          | Cannot replace enabled factor; pending setup replaces secret and clears hashes                                |
| 2FA confirm                        | subject lock, factor reread, pure verifier, enable/hash update and Audit                                                                        | Returns outcome, not secret; application returns newly generated recovery codes only after commit             |
| 2FA enabled secret / password hash | minimal Auth-owned read                                                                                                                         | Secret material stays within Auth's private proof workflow                                                    |
| 2FA consumeRecovery                | subject lock; matching hash removal and Audit                                                                                                   | Single-use mutation under common subject lock                                                                 |
| 2FA disable                        | subject lock; password proof and factor proof under lock; factor delete, sessions revoke, version increment and Audit                           | No profile or IAM access; DEBT-042 correction retained                                                        |

## Redis, delivery and public projections

### Additional owned readers and fragments

| Source family                                 | Exact facts / operations                                                                                                           | Limits                                                                                              |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Account credentials                           | seven-field ID/email/hash/status/version/abuse projection; ACTIVE deactivation, DEACTIVATED reactivation, ACTIVE credential writes | State changes and Audit are transactional; credential changes also revoke sessions; no profile read |
| Account evidence                              | status and createdAt, mapped to active flag and detached date                                                                      | No credentials/roles; missing returns null                                                          |
| Subject eligibility                           | status mapped to ACTIVE boolean                                                                                                    | Distinct from existence; fresh read                                                                 |
| Independent / transactional subject existence | ID-only findUnique, all states; transaction reader uses supplied client                                                            | No new transaction, ACTIVE filter or cache                                                          |
| Active subject selector                       | fixed SQL returning ACTIVE IDs                                                                                                     | Guarded technical fragment, not public user/profile data                                            |
| Subject anchor                                | frozen ID-only select and ID predicate                                                                                             | Shared-row anchor, not an access decision                                                           |
| Profile account fragment                      | frozen email/status/emailVerifiedAt select; email and state predicates                                                             | Technical presentation facts, no password/session/authorization fields                              |
| Enrollment fragment                           | copies email/passwordHash only                                                                                                     | Write-only Auth-owned fields; root owns registration INSERT                                         |
| Leaderboard fragments                         | fixed users alias/ID/creation time/ACTIVE eligibility                                                                              | Trusted infrastructure SQL only, no user-provided raw expressions                                   |

AuthModule binds its owned repositories and exports four semantic capabilities,
not the concrete credential/session/2FA services. Its business index has named
contracts and no technical ORM entry export. TokenService signs refresh claims
from opaque subject/version/session and delegates access claims to root's issuer;
it does not query profiles/permissions directly. This source trace is not
cryptographic certification or an exactly-once refresh/replay guarantee.

Login counter Lua increments with first-use counter expiry and renewable block
TTL; successful login clears identity keys, not IP keys. Recovery/verification
use HMAC-derived private keys and fixed 900-second windows. Redis failures
propagate; no new fail-open fallback exists in these adapters. SQL, Redis,
BullMQ and SMTP are not one atomic unit.

Recovery requests queue normalized email without an account lookup; Worker
checks ACTIVE/email under subject lock and stores hash/version. Verification
Worker checks subject ID plus requested email/ACTIVE/unverified under lock.
Both reject requests older than 30 minutes, order replacement by requestedAt,
store hashed credentials and send plaintext links only after commit. Mail
failure can leave a committed credential and is retryable; no exactly-once
delivery or cross-system rollback is claimed.

Auth GraphQL `viewerSessions` explicitly projects six safe metadata fields;
its model has no token hash. Internal Auth session records having token hashes
are therefore not evidence of a public hash disclosure. AuthService returns
opaque subject ID and tokens, not a Users aggregate. Credential changes revoke
sessions and increment authVersion; deactivation/reactivation preserve their
existing state guards. Command Deck step-up/owner policy remains future work,
not added by this audit.

## Confirmed DEBT-068

Worker checks the destination at issuance, but `email_verifications` records
only subject/hash/expiry, not that destination or authVersion. The real
`changeEmail` adapter clears verification, increments version and revokes
sessions, but leaves the old verification credential. Consume later identifies
the subject by that same token hash and verifies its current email.

An added isolated PostgreSQL characterization invokes the actual
`PrismaAccountCredentialsRepository.changeEmail`, observes the new unverified
email and incremented version, then invokes actual verification consume with
the old digest. It succeeds and verifies the new destination. This demonstrates
missing destination-proof binding, not cross-account takeover, SMTP delivery,
an HTTP exploit or public credential disclosure.

Fresh focused run: six verification DB cases pass with `RUN_AUTH_DB_TESTS=1`,
zero skips, 12.496 seconds, normal exit 0. The added test characterizes the bug;
green here does not mean secure behavior. Fixtures use a unique schema and
production-shaped tables; Audit is doubled, not a live Audit rollback proof.
The owner approved a separate pre-Phase-11 security correction, including
serialization and DB/HTTP regression coverage. No runtime correction is in this
audit packet.

## Local verification

Final-source full API coverage passed 1,148/1,148 tests in 156 suites, zero skips,
57.696 seconds, normal exit 0; all four DB/Redis opt-ins were enabled. The first
full run also passed before replacing an unsafe Jest `expect.any(Date)` object
assignment with explicit address/date assertions. Initial lint failed on that
new matcher; corrected lint passes without suppression or weaker assertions.
Architecture (139 cases, zero inventory findings), workspace types, Prisma
validation, build and Editor/Storage/Worker/Web/dependency-patch commands pass.
Global formatting remains red on the existing 41 files; production dependency
audit remains red (one high, nine moderate). Full audit including development
dependencies is also red (one high, ten moderate).

Full migrated E2E completed 507 PASS / 1 FAIL / 0 skipped of 508 in 48 suites,
422.156 seconds. The sole failure is inherited DEBT-045 News viewCount null/zero;
all 26 App cases pass, without closing its separate intermittent timeout debt.
Jest retained handles after writing results. After zero DB clients and zero
`api_boundary_%` schemas were verified, only completed Jest PID 25788 was stopped;
the shell reported -1, not normal green termination. No rerun/timeout increase.

GraphQL generation succeeds; consistency remains red on inherited DEBT-044
generated eslint-disable comment drift. Only this run's drift is restored,
leaving SDL/generated files identical to Git. SDL SHA-256:
`C03170CB54027C557F662A5B9BF5F85CAFA2112B8623D3FCA360E8FA9C82FD2C`.
No independent review, CI acceptance or broad green baseline is claimed.

## Remaining acceptance

Reviewing locks does not prove every race, refresh replay policy or all
credential transitions. Remaining D4 ownership reconciliation, D4.5 acceptance,
D5–D7, the separate stack-boundary audit and Phase 11 brainstorm stay open.
Parent CI at `2dc275c` was queued when inspected; it is not certified green.
