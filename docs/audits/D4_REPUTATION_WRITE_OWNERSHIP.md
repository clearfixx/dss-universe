# D4 — Reputation write ownership

Date: 2026-10-15. Status: local runtime verified; full quality/CI/acceptance open.
Branch `debt/d4-reputation-write-boundary`, based on `5d353dc` / draft PR #19.
The parent review stack is unaccepted. No red PR is merged.

## Scope and preserved boundaries

This approved D4 increment removes the foreign actor joins from Reputation's
`createDirect` and `reverse` persistence. Reputation owns ledger facts, advisory
locks, cooldown and duplicate decisions, policy, audit and outbox. Users owns the
four public actor fields: id, username, displayName and avatarUrl. Root
infrastructure binds those stateless technical adapters to the existing write
transaction behind a Reputation-owned semantic transaction port.

The projection callback and explicit transaction client exist only in guarded
infrastructure. Neither enters the business port. The root performs no owned
table SQL; the ledger writer performs no Users SQL. A shared pure mapper copies
the existing response fields and rejects incomplete actor evidence. Read-unit
query order and transaction orchestration are not extracted into a generic
composer. Compensation association uses the original entry ID, not array position.

Application eligibility remains upstream and unchanged. Display persistence does
not add an ACTIVE filter to historical actors. Policy/updatePolicy stay local to
Reputation. Normalized AST comparisons against the parent confirm unchanged
`lock`, `appendEvidence`, `policy` and `updatePolicy` method bodies.

No frontend, GraphQL/Prisma schema, migration, dependency, scoring formula, owner
right, timeout, retry, cache or isolation change is included. No Phase 11 code.

## Characterization and runtime evidence

Before the transfer, **13 migrated E2E passed**, zero skipped, normal exit
(13.506 s). The observed successful write schedule is ledger INSERT → original
actor lookup → compensation lookup → second actor lookup → audit → outbox → COMMIT.
The pinned Prisma engine emits that second Users query even when no compensation
exists. An initial assertion assuming one Users query was corrected to the
observed two before changing production code.

The operation-specific Users write reader retains this empty lookup stage. Its
empty IN predicate returns no rows, equivalent to the old relation query's IN NULL
for this stage; byte-identical SQL is not claimed. The existing history reader's
empty-ID short-circuit remains unchanged. Both select only the four public fields,
without credentials, email, role or account-state evidence.

The final write suite has **23 migrated E2E**: the 13 characterizations plus ten
runtime probes. The focused combined run passed **39/39**, zero skipped, normal
exit (24.246 s), including all 16 unchanged Reputation read regressions. A final
association-only correction and its unit regression followed that focused run;
the full run below checks the final source.

Coverage includes:

- rolling cooldown's strict `gt` boundary, no permanent actor-pair uniqueness,
  signed negative original/positive compensation and duplicate short-circuits;
- two genuine direct contenders and two genuine reversal contenders, observed
  waiting on an externally held exact advisory key before release: one committed
  result and one null, without sleeps or larger budgets;
- faults after actual ledger INSERT, both actual Users lookup stages, owned
  compensation SELECT, and genuine audit/outbox appends: all persisted ledger,
  audit and outbox snapshots remain unchanged;
- missing actor evidence throws rather than returning a partial actor;
- actual SHOW confirms Read Committed inside the write; an independent committed
  non-key displayName update is observed at the existing actor-read stage;
- exact event name/version/category/producer/payload and audit evidence, plus a
  rejected actual ledger UPDATE with immutable-history triggers still enabled.

The new unit suite contains **18 tests**, included in the final full coverage run.
It verifies explicit client identity, default transaction options, ordering,
selection allowlists, unrelated compensation rejection, duplicate paths,
provider failures, owned policy and semantic delegation. Mocks do not certify
authorization or rollback; migrated E2E supplies that persistence evidence.

## Quality gates

Final API coverage: **985 PASS / 142 suites**, zero skipped, normal exit (60.992 s),
with all four Auth/recovery/IAM DB and Auth Redis opt-ins. All **26 thresholds**
pass, preserving the previous 21 without reduction. New files have 100%
statements/functions/lines; branch coverage is root write unit 75%, ledger writer
87.5%, repository 75%, pure mapper 100%. The Users write reader has no branch
sites (treated as 100% by the gate). Remaining uncovered branches are Nest
dependency metadata. The unchanged read-unit branch threshold stays 80%; its
current measured branch coverage is 81.25%.

Root lint, typecheck, Prisma validation and production build PASS (fresh API,
five unchanged cached outputs). All **68 architecture fixtures PASS**; frozen
inventory remains **89**, with no growth or waiver. Four new fixtures pin owned
SQL surfaces and explicit guarded/public exports. Import counts do not certify
SQL ownership.

Fresh adjacent tests PASS: Editor **23**, Storage **43**, Worker **36**, Web **59**,
with their existing coverage gates where configured. All **14** dependency patch
regressions PASS. Global format remains red on **41** inherited files; dependency
audit remains **1 high / 10 moderate**. Generated GraphQL consistency remains red
on inherited DEBT-044 barrel comment/newline drift. Its own generated side effect
was restored exactly; canonical schemas and authored frontend remain unchanged.

Final full API E2E: **372 PASS / 1 FAIL**, 373 tests / 37 suites, zero skipped
(252.537 s). All 23 write-ownership cases, all 16 read-ownership cases, eight
Reputation/profile asset cases, the existing ledger case and all 26 Auth cases
pass. The only failure is known DEBT-045 News foundation viewCount null/zero
expectation and protected interaction-target cleanup. DEBT-048 does not reproduce
in this run; this does not close that separate debt.

Only the verified own tmpfs PostgreSQL project bound to loopback 5435 was
recreated from empty, with all 54 migrations and no seed. Dev 5433 and
unit/integration base 5434 were not reset. Complete Jest JSON was emitted, but
retained handles prevented normal exit. Only verified owned Jest PID 15584 was
stopped after checking zero active DB work and zero owned test schemas. This is
not a successful process exit or a full green E2E gate. No tests were skipped,
timeouts raised or history protections disabled.

No browser or dev server was started. No new full browser success is claimed;
the unchanged broken Web entry remains a separate readiness problem.

Ignored raw evidence: `node_modules/.cache/dss-d4-reputation-write-*` and the
current API coverage report. These are local artifacts, not durable CI evidence.

## Remaining work

Users/IAM shared-row and role SQL ownership, remaining transaction-local subject
checks in Achievements/Custom Titles/IAM, complete delegate/relation/raw-SQL/Worker
review, D4.4/D4.5, D5–D7, the requested stack audit and owner acceptance remain
open. DEBT-057 stays separate and unimplemented. The owner-authored untracked
stack audit plan remains untouched/unstaged. Phase 11 requires the separate
mandatory brainstorm after preparation and stack-audit acceptance.
