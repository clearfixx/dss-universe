# D4 — Transactional mention ownership

Date: 2026-10-15. Status: characterization verified; runtime design approved by
the owner on 2026-10-15. No production transfer or acceptance is claimed.

Branch `debt/d4-transactional-mentions` starts from published D4.3d3b `60a5d53`
(draft PR #16). Parents remain unaccepted. The authorized D4 plan requires
transaction-local recipient resolution and atomic comment/revision/mention/
audit/outbox evidence, not a profile pre-read or ambient ORM business context.
ADR-003 assigns profile handles to Users and minimal ACTIVE state to Auth;
the physical shared users table does not merge those responsibilities.

## Current behavior, established before transfer

`PrismaCommentsRepository` opens a default Read Committed write transaction for
create/edit/tombstone. It registers the comment target, writes state/revision,
queries candidate users, reconciles mention transitions and appends all audit/
outbox evidence inside that transaction. Edit holds the existing comment advisory
lock before computing the next revision. Reads/list/revisions remain separately owned.

Candidate resolution currently issues one Users-table SELECT containing ACTIVE,
author exclusion and case-insensitive username predicates; it selects only id and
username, ordered by id. The subsequent resolver compares using en-US locale,
accent sensitivity, then exact spelling first, otherwise a unique match. Both
ACTIVE filtering and author exclusion happen before that ambiguity decision.

Application extraction is unchanged: structured mentions first, raw text second,
case-normalized deduplication and maximum 20 names. SQL ILIKE can include wildcard
candidates for an underscore, but the final literal locale comparison rejects
nonmatching handles. Do not change either stage while transferring ownership.

Missing/inactive/self-only and ambiguous candidates produce no mention. An unchanged
active mention produces no new mention event; removing it retracts its row; adding
it back reuses the same row/id and updates activatedAt. Tombstone retracts all
active mentions but leaves immutable revisions/history intact. Notification events
contain only the existing IDs; they never carry profile, credentials or comment body.

## Why two owner calls are not equivalent

The new migrated probe starts with one subject whose old handle is BANNED. A profile
read finds its ID/name. One independent atomic commit renames it and sets ACTIVE.
A subsequent eligibility read finds the ID active. Combining those two results
creates a recipient even though neither committed state has old handle AND ACTIVE.
The original combined predicate returns no candidate both before and after.

This is a verified counterexample to a proposed split design, not a new defect in
current one-query resolution. Under Read Committed, ordinary SELECTs use statement
snapshots and successive commands may observe different commits; see
[PostgreSQL 17 transaction isolation](https://www.postgresql.org/docs/17/transaction-iso.html).
Do not silently apply News's separately approved Repeatable Read policy to comment
writes: that changes visibility/retry behavior and is not this design's authority.

## Approved ownership transfer — runtime pending

1. Interactions keeps its comment/target/revision/mention-diff/evidence algorithm in
   an owned stateless technical writer. Its normal repository retains reads and
   consumes a semantic create/edit/tombstone transaction port, with no ORM/callback
   in the business contract.
2. Users provides an infrastructure-only parameterized candidate subquery (id,
   username, case-insensitive requested handles and author exclusion) and owns the
   unchanged pure exact/unique recipient matcher. It has no Auth import/status SQL.
3. Auth provides an infrastructure-only ACTIVE subject-ID subquery. It neither
   receives usernames/profile aggregates nor imports Users.
4. Root infrastructure joins these two named owner subqueries on opaque identity,
   executes one bound SELECT at the existing resolution point, then asks Users to
   apply the existing matcher. This is one operation-specific technical composition,
   not a generic SQL builder, query service or business API returning Prisma.Sql.
5. Root owns the existing default-isolation transaction and binds the writer's
   narrow infrastructure-only recipient-resolution callback to that same explicit
   client. The callback receives names/excluded ID and returns recipient IDs only;
   it never enters application/domain contracts or becomes an ambient transaction.
   The owned writer invokes it at the current point, preserving write/event order.

Only guarded infrastructure entries/root assembly may import the technical
selectors/writer. Ordinary business roots must not re-export them. User values
are bound parameters; no arbitrary table, alias, fragment or raw text from an API
is accepted. The root composes published technical projections, not a copy of
foreign SQL/credentials/profile repositories. Empty names skip candidate SQL.

No new table, migration, isolation level, retry policy, timeout, ACL, moderator/
owner right, public transport shape, frontend design or notification behavior.
Eligibility is authoritative at the existing SELECT point, not newly guaranteed
at commit time. Failures propagate and roll back the entire owned operation.

The owner explicitly selected “Так, один SQL через підзапити власників” on
2026-10-15. This authorizes the described operation-specific runtime transfer,
not a broader SQL framework or isolation change. Implementation follows the
independent Reputation read-boundary package already in progress; do not mix the
two runtime changes or treat the characterization PR as completed ownership.

## Verified characterization

`comment-mention-transaction-characterization.e2e-spec.ts`: **16 PASS**, zero
skipped, normal exit (21.142 s), actual AppModule/owned migrated PostgreSQL schema.
No production source is changed by the characterization.

The cases cover current statement count/allowlist/default isolation, no-name SQL
short-circuit, all three inactive statuses, exact/ambiguous case collisions,
ACTIVE-before-ambiguity, self-before-ambiguity, underscore and Unicode/accent
behavior, lifecycle/event payloads, concurrent revision serialization, and the
split-read counterexample. Three faults throw only after actual audit/outbox
writes and prove unchanged comment/revision/mention/target/evidence state after
rollback. No successful authorization is mocked and no history trigger disabled.

Evidence is ignored under `node_modules/.cache/dss-d4-mentions-*`. Full gates on
the foundation and eventual runtime transfer must be recorded separately; parent
green subsets are not current acceptance. Current parent draft #16 has both
storage OS checks successful, Web/audit failed and its main job still live when
read; it is not merged or treated as a release baseline.

### Foundation gates (not runtime acceptance)

Full API coverage: **916 PASS**, 138 suites, zero skipped, normal exit (59.878 s),
all four DB/Redis opt-ins and all ten existing thresholds. Root lint/typecheck,
Prisma validation and production build PASS (fresh API, five unchanged cached
outputs). All 55 architecture fixtures and frozen 89-finding inventory PASS;
the known foreign mention lookup is not erased from the ownership inventory.

Global format remains red on 41 inherited files; dependency audit reports one
high / ten moderate findings; all 14 patch regressions pass. No dependency or
tooling rule is modified to green them. Full E2E baseline is separately run on
the verified owned tmpfs PostgreSQL project on 5435 after recreating only its
synthetic fixtures: zero tables before all 54 current migrations, no seed. Dev
5433 and the 5434 unit/integration base are not reset by this run.

Full E2E: **320 PASS / 1 FAIL**, 321 tests across 34 suites, zero skipped
(229.846 s). All 16 mention cases and all 26 Auth E2E cases pass in that run.
The failure is the already recorded DEBT-045 News foundation viewCount null/zero
expectation and prohibited target cleanup. After Jest emitted its complete JSON,
remaining handles prevented normal exit. Only this run's verified owned process
(PID 15192) was stopped after checking zero active database work/owned API schemas;
that terminated process is not reported as a successful exit or a green gate.

Fresh adjacent workspace tests also pass: Editor **23**, Storage **43**, Worker
**36**, Web **59**; the latter three include their existing coverage gates. The
generated GraphQL consistency check remains red on inherited DEBT-044 barrel
comment/newline drift. Its generated Web side effect is restored to the exact
parent content; canonical schema and authored frontend remain unchanged.

No authored frontend, public GraphQL/Prisma schema or production source changes
are part of this foundation. Existing broken Web entry is not repeatedly walked
beyond its first failed boundary on an unchanged frontend; parent evidence is
identified as parent evidence rather than a current full Web pass.

## Runtime verification requirements

- Preserve all golden cases and add differential candidate checks for owner SQL,
  including exact/ambiguous/inactive/self/Unicode/wildcard inputs and input order.
- Verify one actual composed candidate SELECT inside the existing transaction,
  no second owner read/cache and no secret columns. Pin owned SQL surfaces and
  guarded entries without broad waivers or baseline growth.
- Verify failures in selector/matcher/target/comment/revision/mention/audit/outbox
  stages roll back all persisted changes. Retain concurrent revision numbering.
- Run complete format/lint/typecheck/unit/integration/E2E/Prisma/build/architecture,
  generated consistency and dependency audit; report inherited blockers honestly.

Remaining D4 SQL owners, explicit exports/ORM isolation/enforcement, D5–D7,
stack boundary audit and owner acceptance remain in scope. Phase 11 still requires
its separate mandatory brainstorm. The owner-authored untracked stack audit plan
remains untouched and unstaged; DEBT-057 tombstone transport stays separate.
