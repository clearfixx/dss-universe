# DEBT-074 — Deterministic social privacy response facts

Date: 2026-10-22. Owner approved separate D6 test-only correction after DEBT-061.
Status: focused regression passed; full gates/CI/review open.

## Evidence and boundary

GitHub run39768009772 at395c744 reports585/586 passing API E2E tests.
The following-list owner assertion receives the seeded January lastSeenAt but
expects a newer presence timestamp read from PostgreSQL after the response.
The failed log remains `dss-d6-ci055-failed.log` in local temp.

UserPresenceInterceptor intentionally starts presence.touch without awaiting it
before next.handle. A later persistence read is not the response's snapshot.
No production privacy leak or production-entry failure follows from this
test-oracle race. Production code, auth/ACL, query isolation, deadlines and
response contracts are unchanged by this correction.

## Correction and deterministic ordering regression

The privacy suite controls only UserPresenceService.touch; real Auth-issued
credentials, HTTP/GraphQL, Users persistence, privacy projection and all other
presence methods remain in use. Ordinary privacy scenarios now retain their
exact seeded timestamps and compare the complete owner profile exactly.
Redaction, total/order/page boundaries and bounded privacy reads are unchanged.

A separate HTTP case configures the touch spy to wait on an explicit promise
gate, then write a different known timestamp through real Prisma. The response
must complete before the gate opens; it must expose the owner's full exact
seeded profile despite restrictive privacy flags. After release, the test
awaits the actual DB write and checks the later persisted value differs from
the unchanged exact response. This deterministically demonstrates why the old
post-response database snapshot was an invalid oracle. No polling, sleep,
global fake clock or permissive timestamp matcher is introduced.

The gate is released and its write awaited in finally; the spy is restored
when the owned application/fixture closes. Existing failure/redaction probes
still exercise real policy and fail-closed behavior.

Focused suite:6/6 tests, natural exit0,18.744s. Log:
`dss-d6-presence-privacy.log` in local temp. Full quality, combined fresh
coverage/E2E, generated consistency, security and remote CI are still required.
No claim of full D6 or Phase11 readiness is made.

The subsequent full quality attempt passes format/lint/types/Prisma and profile
controls, then stops on the existing DEBT-041 nondeterministic TOTP tamper test:
1280/1281 API tests pass. This failure is retained as
`dss-d6-presence-quality.log`, not relabeled as a privacy regression or retried
without a correction. Scoped privacy-file lint also passes. The separate local
DEBT-074 checkpoint has focused verification; full acceptance remains open
until the independent D6 DEBT-041 test correction and combined gates.

After the separately committed DEBT-074 change, the independent DEBT-041
correction makes the full combined `pnpm quality` pass naturally: API1284/1284,
Worker50/50, Web60/60, build/post-build check and architecture140/140.
Log: `dss-d6-combined-quality.log`. Fresh coverage plus full E2E and new-head
remote CI/review remain open, not inferred from these unit/build gates.
