# D4 — Reputation read ownership

Date: 2026-10-15. Status: local runtime verified; full quality/CI/acceptance open.
Branch `debt/d4-reputation-read-boundary`, based on `cf04110` / draft PR #17.
The parent stack is unaccepted and no red PR is merged.

## Scope and authority

The approved D4 inventory includes foreign Users fields in Reputation projections.
This increment transfers `history` and `findOriginalById` through a Reputation-owned
semantic entry-reader port. Reputation owns ledger facts, original/reversal
selection, original count and signed score. Users owns exactly four current public
actor fields: id, username, displayName, avatarUrl. Root infrastructure composes
those projections through guarded ADR-004 technical entries.

This is a runtime change, unlike the preceding mentions foundation. It is not full
Reputation persistence acceptance: `createDirect` and `reverse` still include actor
relations inside their write transactions and require a separate ownership transfer
preserving atomic audit/outbox and response failure behavior. Policy, cooldown,
locks, immutable ledger writes and events are untouched here.

## Preserved observations

The pre-transfer migrated characterization observed six SELECTs for a populated
history with reversals: original entries → original actor profiles → reversal facts
→ reversal actor profiles → original count → all-entry signed sum. The driver logs
COMMIT but not BEGIN; an initial assertion expecting BEGIN was corrected rather
than changing production transaction behavior.

The new history composition preserves that sequential schedule and its default
Read Committed transaction. It does not adopt News's separately approved Repeatable
Read policy, combine actor batches into one observation point, introduce retries,
change timeout or cache a public profile. `findOriginalById` retains independent
reads, no new explicit transaction, and null for absent or compensation IDs.

Current profile renames remain visible; inactive historical actors are not removed.
Original rows only form the page/count; compensations contribute to the score.
Timestamp/ID descending ties, page metadata and zero sum fallback are unchanged.
No email, credentials, access state or media ID enters the actor query/projection.
Missing/provider-failed evidence throws rather than synthesizing an actor/page.

No frontend, public GraphQL schema, Prisma schema/migration, dependency, scoring
formula, access policy, owner right or Phase 11 implementation is included.

## Focused evidence

- **16 migrated E2E PASS**, zero skipped, normal exit (7.825 s): golden history,
  pagination, reversals, actor allowlist/renames/inactive state, missing original/
  recipient, six-statement schedule, independent original reads, and differential
  comparison with the `cf04110` Prisma relation-read algorithm on the same ledger.
- An independent committed rename between the two genuine actor reads yields the
  old original actor name and new reversal actor name, while SHOW confirms Read
  Committed. This deterministic probe rejects an accidental isolation upgrade or
  merged observation point; it is not a new current-code vulnerability.
- A later Users-reader failure rolls back the real history transaction, skips
  count/score and succeeds on a fresh call. Immutable-history triggers stay enabled.
- A test-only call-through probe of the pinned Prisma 7.10.0 engine verifies both
  old batch and new callback start options: maxWait 2000 ms, timeout 5000 ms,
  database-default isolation. The installed runtime passes the same configured
  defaults into both paths; no timeout or acquisition budget was changed. Do not
  infer older Prisma batch behavior from callback-only documentation. Production
  does not access private engine APIs. See the [Prisma v7 transaction reference](https://www.prisma.io/docs/orm/v7/prisma-client/queries/transactions)
  for the documented API distinction; the batch budget equivalence is established
  by this installed-runtime probe, not asserted by that page.
- **19 unit PASS** verify root client identity/query order, independent lookup,
  short-circuits, both missing actors, each provider failure, signed sum and the
  owned technical query allowlists. Authorization success is not mocked.

Ignored evidence: `node_modules/.cache/dss-d4-reputation-*`. Full gate results are
recorded below after completion; parent results are not substituted for this run.

## Quality gates

Full API coverage: **935 PASS**, 139 suites, zero skipped, normal exit (68.654 s),
all four Auth/recovery/IAM DB + Auth Redis opt-ins. All 13 thresholds pass, including
three new scoped thresholds: root reader 100% statements/functions/lines, 85%
branches (remaining branches are Nest dependency metadata); both owned selectors
100% for every metric. No existing threshold was lowered.

Root lint/typecheck, Prisma validation and production build PASS (fresh API plus
five unchanged cached outputs). All **59** architecture fixtures PASS; the frozen
inventory stays **89**, without baseline growth. Four new fixtures pin owned SQL
surfaces and guarded exports/imports. Import counts do not measure SQL ownership.

Fresh adjacent workspace tests PASS: Editor **23**, Storage **43**, Worker **36**,
Web **59**, with existing coverage gates where configured. All **14** dependency
patch regressions PASS. Global format remains red on **41** inherited files;
dependency audit remains **1 high / 10 moderate**. Generated GraphQL consistency
remains red on inherited DEBT-044 barrel comment/newline drift; its side effect is
restored exactly. Canonical GraphQL/Prisma schemas and authored frontend are unchanged.

Full E2E was rerun on the verified own tmpfs PostgreSQL project bound only to
5435, after 54 migrations without seed. Dev 5433 and unit/integration base 5434
are not reset. The first run completed **335/336 PASS**, known DEBT-045 only,
and emitted complete JSON; its retained handles required stopping only verified
PID 24476 after zero active DB work/owned schemas. This is not a successful
process exit or a full green gate.

The final full run, including the timing probe, completed **335 PASS / 2 FAIL**,
337 tests / 35 suites, zero skipped (276.560 s). All 16 new Reputation tests,
16 mentions characterizations, eight Reputation/profile asset tests and the
existing GraphQL ledger test pass. Failures match DEBT-045 (viewCount and protected
cleanup) and DEBT-048 (the broad registration/viewer test's 5000 ms Jest timeout).
No root cause of the timeout is inferred from its recurrence. Complete JSON was
emitted; retained handles again required stopping only verified owned PID 5100
after checking zero active DB work/owned schemas. This is not a green process exit.

After that process stopped, the separate full Auth suite passed **26/26**, zero
skipped, normal exit (29.153 s), without raising timeouts or skipping tests. This
isolated pass does not erase either failure in the full run. No out-of-scope D6
test restructuring, immutable-history bypass or production timeout change is made.

No browser/dev server was started here. The unchanged broken Web entry was not
repeated beyond its already established first boundary, and no current full
browser success is claimed.

## Remaining work

Reputation write-response joins, approved but unimplemented mentions SQL transfer, Users/IAM shared-row
ownership, remaining transaction-local subject checks, D4.4/D4.5, D5–D7 and the
stack boundary audit remain open. The owner-authored untracked stack audit plan is
untouched/unstaged. DEBT-057 remains separate. Phase 11 still requires owner
acceptance and its mandatory brainstorm.
