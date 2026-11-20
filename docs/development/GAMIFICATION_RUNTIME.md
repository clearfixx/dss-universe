# Automatic gamification runtime

The API build contains a separate headless Nest process. It does not import the
HTTP/GraphQL application or replace the Activity Worker. The dedicated BullMQ
queue is `dss.gamification.v1`, with private prefix `dss`. Messages contain only
admission ID, epoch and sequence. They are wake hints, never economic inputs.

## Deployment and activation

This is a trusted OS-operator tool, not a website role, alternate account or
recovery backdoor. Deploy the API artifact and normal forward migrations first.
Use the same prepared PostgreSQL/Redis configuration as DSS. All producing API
processes must use the upgraded producer contracts. Keep canonical Outbox rows;
automatic pruning of required evidence is unsupported. PostgreSQL connections
must use UTC. These are conditions controlled by the owner of the deployment.

The committed example is disabled. Set
`DSS_GAMIFICATION_DEPLOYMENT_CONFIRMED=1` only after checking those conditions.
Preflight verifies the physical schema protocol, database timezone and all
enabled rule inputs, including rules on inactive Achievement definitions. It
never silently disables or rewrites an incompatible rule. Correct such rules
through their existing administrative interfaces before activation.

From the repository root:

```text
pnpm --filter @dss/api build
pnpm --filter @dss/api start:gamification preflight
pnpm --filter @dss/api start:gamification prepare
pnpm --filter @dss/api start:gamification status
pnpm --filter @dss/api start:gamification activate 0
```

Revision0 is the initial prepared state; always inspect `status` before a
revision-sensitive command. Activation repeats configuration checks under the
same exclusive transaction lock as the transition. It persists the immutable
UTC cutoff using database time. Eligible Outbox rows have `createdAt >= cutoff`;
`occurredAt` remains business time. A pre-cutoff row committed later is excluded;
a post-cutoff row committed late is found by reconciliation. No historical
replay, legacy rewrite or existing-balance recalculation is performed.

To run the consumer, explicitly set `DSS_GAMIFICATION_ENABLED=1` and invoke:

```text
pnpm --filter @dss/api start:gamification run
```

Neither the environment flag, normal `pnpm dev`, module imports nor merging the
code activates an unprepared deployment. The trusted command must activate it.
This package's verification uses only isolated disposable schemas and test
Redis; developer/production data is not activated by implementation or tests.

## Pause, failure and retry

```text
pnpm --filter @dss/api start:gamification pause <current-revision>
pnpm --filter @dss/api start:gamification resume <current-revision>
pnpm --filter @dss/api start:gamification retry-publication <event-uuid> <cycle> "review reason"
pnpm --filter @dss/api start:gamification retry-consumption <admission-uuid> <epoch> "review reason"
```

Pause is soft: it prevents new claims; accepted work may finish. Stopping the
process does not erase pending work. SIGINT/SIGTERM stops and drains the work
loop/broker before closing the Nest context and database connections.

Publication and consumption retain independent60-second leases and five
technical failures per cycle/epoch, with backoff1/2/4/8 seconds. Recovery fences
old tokens. An accepted owner transaction already in flight cannot be cancelled
by fencing; replay therefore relies on its existing durable owner receipts.
This is at-least-once processing, not exactly-once execution.

Owner `CONTINUE` persists one bounded page and schedules more work without
spending technical failures. Domain blocks stay explicit. Manual retry requires
the current blocked cycle/epoch and a reason. It appends audit, starts a new
budget and preserves sealed input, completed-owner flags, progress and all old
attempt/failure/rejection history. Concurrent stale retry requests are rejected.
Retry does not manufacture missing provenance or make conflicting evidence valid.

Finished wake jobs are removed. Periodic bounded discovery, reconciliation and
due-receipt inventory repair missed initial queue calls, failed acknowledgements,
lost hints and owner continuations. A hint grants no claim: the consumer always
claims current eligible database work before reading its immutable seal.

## Verification checkpoint

The package includes actual producer/DB/Redis/owner delivery, Points replay after
an owner-commit/root-bookkeeping crash prefix, ledger-to-Levels second hops,
Achievement retirement/continuation, operational retry concurrency/audit rollback,
headless activation/configuration serialization, lifecycle and built disabled
entrypoint checks. A synthetic crash prefix is not a process-kill or elapsed
lease proof; existing consumption/recovery suites cover those storage phases.

Initial candidate logs are retained. The first broker fixture timed out during
withdrawal; its exact cause was not established by a later passing diagnostic.
The manual fixture now completes old and fresh finite reconciliation passes,
rather than assuming one tick must discover a late commit. No timeout, assertion,
retry budget or runtime delay was increased. A separate initial unit import
loaded required environment validation; the lifecycle class is now independently
importable without initializing deployment configuration.

Final full acceptance remains pending. No successful full gate, deployed
activation, D7 closure or stack-audit completion is claimed by this checkpoint.

The first full gate at `518bcad` passed all1632 API unit tests but finished
936/938 E2E: the broker withdrawal timed out, then its dependent assertion failed.
The retained receipt is `runtime-delivery-full-a66cf6e834d04a81bea4f3b426842722`.
The pending receipt was READY with no owner completion or technical failures.
A deterministic PostgreSQL control subsequently demonstrated that wake inventory
using the claim query's row locks can make a simultaneous SKIP LOCKED claim see
no work. Inventory now reads without those locks; actual claims retain them.
The regression checks both the blocking control and concurrent read-only case.
The real broker fixture now runs the production periodic runner for hint repair
and owner continuations, while preserving the deliberate lost-initial-wake
prefix. This establishes a concrete interference defect and its correction;
it does not establish the cause of every earlier timeout. Deadlines, assertions
and failure budgets remain unchanged. A new full gate is required for this fix.

## Final acceptance — 2026-11-17

PR167 head13010c1 was accepted and merged as main a4a5451. Exact local quality:full exit0, API1632/1632, E2E939/939 without skips/todo, build6/6, Web15/15 without retries; CI8/8 and native48/48 on three OSes. The prior pending checkpoint above is historical. [Final D7 report and retained failures](../audits/FINAL_D7_CLOSURE.md). Developer/production activation was not performed.
