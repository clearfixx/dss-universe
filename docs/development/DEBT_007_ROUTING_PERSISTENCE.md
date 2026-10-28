# DEBT-007 — Routing persistence, runtime package B

Status: authorized implementation candidate; full gate/CI and acceptance open.
Baseline: accepted main `d992de6` (PR103), following accepted PR101/102.

## Scope

Implements the [approved schema and transaction protocol](DEBT_007_ROUTING_PROTOCOL.md):
four additive tables, closed states/codes, canonical coordinate index, history
guards, explicit control transitions, two discovery lanes and fenced publication
claims. Root composition imports only Database/Audit and narrow Core Events-owned
infrastructure facts. It exports three immutable named capabilities; private
repositories and Prisma are absent from those capability objects/contracts.

GamificationRoutingModule is not imported by AppModule, a runner or an entrypoint.
No scheduler, Redis connection, queue submission, consumer, public activation
tool, owner effect, formula, backfill or UI is added. Migrations create no control
row or active cutoff. Explicit fixture commands do not activate the dev platform.

## Persistence and invariants

Only a fresh additive migration changes DDL. Existing Outbox status/defaults,
payloads, Activity v1/v2 markers and legacy dead letters retain their semantics.
Outbox's new relation causes Prisma alignment changes, not field deletions.
Activation cutoff uses matching TIMESTAMP(3) UTC, is established once and cannot
be changed/deleted through the guarded state history. Future D must supply trusted
operator authorization and reviewed UTC/configuration preflight; B has no public
operation endpoint or fabricated production preflight.

Activation/discovery creation and audit commit together. Control updates use
expected revision under FOR UPDATE. Source discovery takes control FOR SHARE,
then discovery FOR UPDATE; source facts belong to Core Events. A materialized
bounded key batch supplies both reference insertion and cursor advancement in
one transaction. Conflict dedup leaves existing claims/acknowledgements unchanged.
Finite complete sweeps find late prefix commits without a lookback or sole
high-water cursor. C/D still need a fair runner reserving reconciliation work.

Publication uses shared ACTIVE admission, due-row FOR UPDATE SKIP LOCKED and a
new UUID per claim. Queue IO belongs to a later caller outside these transactions.
Success/failure compare destination, event ID, CLAIMED state, token and attempt
coordinates. Recovery invalidates old ownership; expiry alone does not. Pausing
rejects new claims but permits existing acknowledgements and stale recovery.
Recovery does not count a claim twice. Five unsuccessful claims produce BLOCKED;
delays before attempts 2–5 are 1/2/4/8 seconds. Prior failure rows are immutable.
QUEUED is not a domain completion marker; manual retry/consumer state remains D/C.

Source FK deletion restriction is deliberate: referenced envelopes cannot be
pruned without a reviewed retention protocol. Canonical envelope field
immutability and downstream validation are not supplied by a reference alone.
No production activation before these C/D obligations are satisfied.

## Focused evidence and limits

- Real migrated repository E2E: 20/20 across two suites before the final additional
  token-isolation/audit assertions; final full verification remains required.
  Cases cover once-only concurrent activation, audit rollback, SQL guards, exact
  cutoff/zero UUID, atomic insertion/cursor rollback, competing materializers,
  late commits, fixed/empty epochs, SKIP LOCKED, disjoint claims, exact backoff,
  fifth-attempt blocking, failure-history rollback, paused recovery and observed
  claim↔pause / recovery↔acknowledgement lock schedules. No sleeps or retries.
- Real minimal Nest graph/validation:3/3 with DB IO replaced, no startup work,
  immutable capability surfaces and delegated error identity. This graph test
  does not replace the database tests.
- Negative control: removing only acknowledgement's token predicate fails the
  targeted stale-token assertion; restoring it passes the same scenario. Raw RED
  report/log and restored log are retained as `node_modules/.cache/debt007-b-token-red.*`
  and `debt007-b-token-restored.log`. The focused name filter intentionally omits
  unrelated cases; that result is not reported as a complete no-skip run.
- Migration applied only to disposable dss_test5434; schema validation passed and
  Prisma migrate diff returned no difference. Private-schema tests independently
  apply all real migrations. No reset or dev5433 DDL was executed.
- Architecture140/140 and frozen inventory0 passed without refreshing/waiving the
  baseline. Scoped TypeScript and ESLint passed before the final assertions.

### Query work

The permanent performance fixture contains100000 synthetic source rows,
49999 pre-cutoff rows and45000 already routed eligible rows. It measures the real
Core Events-owned initial/positioned source queries with EXPLAIN ANALYZE BUFFERS.
Both select256 through the coordinate index without a source sequential scan.
One local observation:0.162ms initial /0.204ms positioned. Root discovery also
advances over already admitted batches and inserts the next missing batch.
These are measured local source-query observations, not production latency SLAs.

An ignored standalone diagnostic runs the real reconciliation repository through
two complete fixed epochs on the same-sized distribution. Each examines50001 in
196 batches of256: first inserts5001 in3337.71ms; second inserts0 in2901.88ms.
There is no hidden production result cap; the diagnostic checks the known finite
fixture size and never invokes a queue/effect. Source, raw output and retention:
`node_modules/.cache/debt007-b-epoch-probe.cjs` / `.log`. These ignored artifacts
are local evidence and cannot be restored from Git.

The initial scale test timed out after its first source measurement while doing
fixture cursor positioning through an unnecessary source/delivery join. That
fixture step was replaced with direct lookup of the known seeded coordinate;
100000 rows, query assertions and5000ms test timeout stayed unchanged. The raw
failed log remains `node_modules/.cache/debt007-b-query-work-fixture-timeout.log`.
The corrected scale case passed; no claim is made about every historical timeout.
Initial module-test configuration also lacked the options provider override;
the fixture now explicitly replaces both Prisma and its options, preventing IO.

Before production activation, representative live size/distribution, continuous
load, fair scheduling, retention, UTC producer conventions and source-index
deployment timing still need review. An ordinary index build may lock a populated
Outbox table; disposable validation does not authorize immediate dev/production
deployment or establish that production's reconciliation budget is acceptable.

## Acceptance boundary

Full format/lint/typecheck/schema/drift/architecture/coverage/E2E/generated API/
build/production entrypoint/Web smoke and current-head CI remain mandatory.
No package acceptance, DEBT-007 completion, D7 acceptance or Phase11 readiness is
claimed by this candidate. C/D and operational activation require their own work.
