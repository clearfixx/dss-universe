# DEBT-091 — Local bootstrap database target policy

Date: 2026-10-29. Baseline: accepted main ddb685d.
Status: owner-approved correction candidate; full gate and acceptance pending.

## Problem and evidence

Bootstrap compared PostgreSQL URL authority coordinates with root Compose, but
the installed pg driver accepts query host/port overrides. An isolated VM probe
of the previous script accepted both overrides and reached stubbed deploy/seed;
pg Client metadata resolved synthetic.invalid or port6543. No connection, actual
command, migration or seed was executed. Prisma migrate-engine interpretation
was not tested. Current primary development coordinates are independently local.

The seed uses PrismaPg with DATABASE_URL. Checking URL authority alone therefore
does not establish that its effective PostgreSQL target matches local Compose.

## Approved policy

The owner approved this separate package and exact bootstrap-only policy:

- URL has no query or exactly `?schema=public`.
- Other parameters, duplicates, encoded query aliases and fragments are rejected.
- Existing local authority, credentials, database and Redis checks remain.
- Configuration is never rewritten; failures contain no supplied URL or secrets.

All committed root/API/Worker example URLs use schema=public. Future connection
options need explicit review; bootstrap does not silently accept them. This does
not restrict runtime URLs or unrelated database commands outside bootstrap.

## Implementation and proof

`scripts/bootstrap-environment-policy.mjs` owns a pure named validation function.
Bootstrap invokes it for API and Worker after its existing file/local/process
environment composition and before install, Compose up, deploy or seed. Runtime
version checks and read-only Docker info remain before the guard as previously.

Six regression tests cover accepted generated/query-free URLs, authority and
Redis mismatches, malformed/encoded/duplicate queries, fragments, secret-safe
errors and the installed driver's effective host/port parsing without connect.
Actual bootstrap source is evaluated with virtual files and stubbed child
commands: API/Worker env, API local override and inherited process URL rejection
must stop before every mutating command. Safe configuration preserves command
order and existing files. No real child process, Docker call or DB operation is
executed by those fixtures. The tests are mandatory in test:quality-policy.

Focused regressions6/6 pass. Full local gate and exact-head CI must also pass
before acceptance. No database reset/migration, dependency update, frontend
change, runtime consumer, Phase11 implementation or D7 acceptance is included.
