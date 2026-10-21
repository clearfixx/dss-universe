# DEBT-068 — Invalidate obsolete email verification proof

Date: 2026-10-19. Branch `debt/debt068-verification-destination`, based on
`75b20cb` / draft PR #58 (unaccepted). Owner explicitly approved this separate
security packet before Phase 11.

## Change and serialization argument

Auth's credential adapter invalidates `email_verifications` by subject ID inside
the existing email-change transaction, after the ACTIVE credential UPDATE and
before session revocation and Audit. The UPDATE holds the same subject row lock
used by Worker issuance and verification consume; no new isolation/timeout or
lock scope is introduced. Password-only change explicitly preserves verification
credentials. Schema, API, recovery, role/owner policies and post-commit alerts
are unchanged. No migration or new cross-module production import is needed.

- Issuance commits first: subsequent email change removes its old-address proof.
- Email change holds the lock first: old-address Worker issuance waits, then
  rechecks its existing ID/email/ACTIVE/unverified predicate and does not issue.
- Old proof consumption commits first: email change subsequently clears verified
  state and invalidates remaining proof.
- Email change commits first: waiting consume cannot delete the invalidated
  credential and returns false, leaving the new address unverified.

Fresh proof for the new address still works once. Audit failure rolls back the
email, version increment, invalidation and session revocation together. This
does not bind email proof to every future account policy or introduce a new
ACTIVE consume restriction. It does not certify every authentication race.

## Regressions and harness scope

Two security assertions failed on the unfixed source (15 PASS / 2 FAIL): an old
digest was accepted after change, and credential persistence never invalidated
it. Both pass after the fix. Expanded focused result: 26/26 across credential
unit and verification PostgreSQL suites, zero skips, 2.471 seconds, exit 0.

Verification fixtures use a unique schema with production-shaped tables. Audit
is doubled, not a live Audit implementation. They cover destination invalidation,
new proof, password preservation, transaction rollback, both consume/change
orders and both actual Worker issuance/change orders. Tests observe PostgreSQL
lock contention before releasing barriers; no racing sleep or larger timeout is
used as proof. An issuance fixture trigger/advisory lock exists only in that
owned schema and is cleaned in finally.

Jest's cross-package ESM loader rejected direct and createRequire Worker loading.
The first failed harness leaked its own advisory-lock fixture. Only completed
Jest PID 18396 and exact schema
`verification_test_47a1b5ef25324cd0987fdbac7d50c794` were removed after verifying
its connections closed; only synthetic fixture data was deleted. It is disposable
and recreated by the suite. No production/test DB reset or timeout increase.
Subsequent loader attempts remained red until the actual source moved into a
native Node 24 child process. A test-local process name shadow and unnecessary
dynamic crypto import were corrected, not suppressed.

The test-only `.mjs` bridge imports actual Worker TypeScript with native Node 24,
receives synthetic connection/schema/job data through stdin and returns captured
mail to the parent test pipe, not logs. It closes its own pool. SQL is not copied,
and production Worker/Jest module configuration is unchanged. Test cleanup now
awaits both operations even on assertion failure and releases the gate in finally.

HTTP regression exercises real GraphQL email change followed by rejection of old
proof, persisted unverified new address/no verification audit, then acceptance of
fresh proof with exactly one verification audit. This actual HTTP case passes
in the full migrated E2E run (810 ms), not inferred from unit tests.

## Full local gates

Final-source API coverage passes 1,157/1,157 in 156 suites, zero skips,
116.389 seconds, normal exit 0, with all DB/Redis opt-ins enabled. Architecture
(139 tests, zero baseline findings), workspace lint/types, Prisma validation,
build and Editor/Storage/Worker/Web/dependency-patch commands pass. Global format
remains red on 41 existing files; full dependency audit remains red (one high,
ten moderate). Parent PR #58 checks at exact head `75b20cb` remain queued when
inspected; no CI success is inferred.

Migrated E2E completes 508 PASS / 1 FAIL / 0 skipped of 509 in 48 suites,
396.269 seconds. All 27 App assertions pass, including the new HTTP security
regression; this does not close the separate intermittent App timeout debt.
The sole failure is inherited DEBT-045 News viewCount null/zero. Completed Jest
retained handles after writing JSON. With zero DB clients and zero
`api_boundary_%` schemas verified, only completed Jest PID 22788 was stopped;
shell exit -1 is not a normal green exit. No rerun/timeout increase.

GraphQL generation succeeds, while inherited DEBT-044 generated eslint-disable
drift makes consistency red. Only run-produced drift is restored; SDL/generated
files then match Git exactly. SDL SHA-256 remains
`C03170CB54027C557F662A5B9BF5F85CAFA2112B8623D3FCA360E8FA9C82FD2C`.
Packet-only formatting and native test-bridge syntax pass. Source review
confirms no public API, schema, credential return, Audit metadata, Worker runtime
or timeout changes. Global red gates are not waived by local fix verification.
No green baseline, CI/independent review or accepted debt closure is claimed.
Broader D4, D5–D7, stack audit and Phase 11 brainstorm remain required.
