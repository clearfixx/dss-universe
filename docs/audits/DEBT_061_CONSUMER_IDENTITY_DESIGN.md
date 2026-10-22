# DEBT-061 — Worker consumer identity design

Date: 2026-10-22. Status: owner approved v1 preservation; implementation and
verification in progress. No historical data rewrite is authorized or performed.

## Current evidence

Worker main configures `dss.worker.integration-events.v2` for DeadLetterService,
but passes only store and handler to createIntegrationEventProcessor. Its
default is `dss.worker.integration-events.v1`; processed marker reads and writes
therefore use v1. The shared processor validates, checks a marker, invokes the
handler and then writes a marker. These are not one atomic effect transaction.

DeadLetterService records its configured consumer in PostgreSQL and uses it
as the Redis DLQ job-ID suffix. QueueOperationsService.retryFailed retries the
original integration job, then resolves outstanding DLQ rows by eventId without
a consumer filter. Existing v2 DLQ history is thus not excluded from current
retry by its identity. This is source evidence, not a live queue retry proof.

## Approved policy

Keep the identity that actually owns historical processed markers: v1.
Introduce one Worker-owned named constant, consumed by main and the processor
default. Pass that identity explicitly from main to the processor and DLQ.
New DLQ entries and processed markers then agree without opening a new marker
namespace. Do not claim a processing-version upgrade when no handler semantics
are being intentionally versioned.

Do not rename/delete/backfill historical markers, existing DLQ rows or Redis
DLQ jobs. Old DLQ v2 remains history with its original job-ID suffix. Existing
original-job retry continues to check v1 markers; an already processed event
must remain duplicate and must not invoke the handler again. No automatic
bulk replay, migration, new API, timeout, queue policy or exactly-once promise.
This proposal covers the shipped main wiring, not arbitrary external consumers
that may have deliberately used another identity.

## Required implementation evidence after approval

- A persisted historical v1 marker makes the actual corrected processor return
  duplicate without calling its handler, even when old v2 DLQ evidence exists.
- A new event writes its processed marker under the same named identity used
  by a new terminal-failure DLQ row and its Redis job-ID suffix.
- Existing original-job retry can process an unprocessed old-v2-DLQ event and
  preserve current resolution semantics; processed events remain suppressed.
- A composition regression checks main uses the same named identity for both
  processor and DLQ, without loading main and opening all consumers.
- Historical rows/jobs are unchanged except the existing explicit retry's
  resolution update. Use migrated disposable DB and dedicated test queue names;
  do not start an uncontrolled Worker against shared queues or erase Redis.
- Full quality, Worker coverage, relevant migrated DB/Redis tests, build,
  security/generated consistency and remote CI/review remain mandatory.

Out of scope: redesigning marker/effect atomicity, DLQ DB-to-queue atomicity,
retention/redaction, Wall retraction ordering or introducing a new handler
version. Any separately confirmed defect follows the debt/approval workflow.

## Bounded implementation evidence

Owner approved this policy on2026-10-22. The named Worker-owned constant now
feeds main's processor and DLQ, and the processor's compatible default.
No migration, historical rewrite, queue setting or timeout changed.

Worker baseline46/46 tests passed before editing. The updated suite50/50
passes, including historical-marker suppression, new marker identity, DLQ row
and job suffix, and a main-source AST wiring regression. Worker typecheck passes.

Actual migrated PostgreSQL plus uniquely prefixed live Redis tests pass3/3:
new markers/DLQ agree onv1; original-job retry for historicalv2 DLQ processes
an unprocessed event once or suppresses the handler for an existingv1 marker.
Old row fields/job remain intact except the existing explicit retry's resolvedAt.
These tests call the current QueueOperationsService rather than replacing retry
with a test implementation. The handler is an observable test callback; no
claim about every Activity producer or full-main Worker startup is made.

Afterward: zero remaining DB clients/private schemas and no keys under the
owned `dss-debt061-*` Redis prefixes. Logs retained locally:
`dss-d6-consumer-baseline.log`, `dss-d6-consumer-unit.log`,
`dss-d6-consumer-types.log`, `dss-d6-consumer-db-redis.log`.
Full quality/coverage/E2E and remote CI/review remain open for this checkpoint.

The first full quality attempt stopped at a lint finding in the newly authored
test: untyped DLQ job data. The queue now uses the explicit named
DeadLetterIntegrationEventJob contract; scoped lint and formatting pass. That
failed log remains `dss-d6-consumer-quality.log`; full verification follows
the correction rather than suppressing the lint rule.

After correction, `pnpm quality` naturally exited0, including API1281/1281,
all50 Worker tests, the production-entry check, build and140/140 architecture
tests with zero findings. Worker coverage, security/approved patch verification
and GraphQL consistency also exited0. Logs:
`dss-d6-consumer-quality-final.log`, `dss-d6-consumer-coverage.log`,
`dss-d6-consumer-security.log`, `dss-d6-consumer-graphql.log`.

Full combined E2E/remote acceptance remains open: the prior head's CI exposed
the independent approved DEBT-074 social-presence test race (585/586 passing).
This Worker correction does not change that test or waive the failed gate.
The local checkpoint is retained separately; publish after the separately
approved DEBT-074 correction and combined verification, avoiding a knowingly
red intermediate CI run. Do not merge the phase or declare Phase11 ready.

Combined fresh coverage and full E2E subsequently pass after the two separate
test fixes: Worker50/50 coverage and API590/590 E2E in54 suites, no skips or
runtime errors. Owned DB/Redis resources are released and SDL is unchanged.
See [current D6 evidence](D6_FULL_QUALITY_BASELINE.md). Publish the separate
logical commits together; new-head CI and phase review remain open.
