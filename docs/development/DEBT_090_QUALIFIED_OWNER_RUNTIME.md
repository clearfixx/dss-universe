# DEBT-090 — O1 qualified Achievements owner

Date: 2026-11-08. Base: accepted main `fa043a3` (PR146).
Status: authorized implementation candidate; runtime acceptance and merge pending.
The owner separately approved O1 after accepting the
[qualified-owner design](DEBT_090_QUALIFIED_OWNER_DESIGN.md).

## Implemented boundary

Achievements exports the named `QualifiedAchievementConsumer.advance` capability.
The private service validates bounded facts, prepares immutable provenance,
reconciles source state and applies current matching rules in their existing
separate transactions. It has no resolver, scheduler, queue or activation flag.
The API and headless wrapper share the same singleton provider graph. Root still
must attest producer facts against canonical evidence before calling it; a typed
command and these synthetic tests do not supply that missing admission boundary.

Three additive owner tables retain source cursors, exact immutable lifecycle
facts and award qualification bindings. Decimal wire revisions are lossless
PostgreSQL bigint, including values above JavaScript's exact-integer range.
Composite FKs, checks, a partial qualification-identity index and immutable-history
triggers reject conflicting or destructive history changes. Cursor guards reject
decreasing counters, unbacked targets/applied revisions and frontier resets without
a higher generation. Existing migrations and historical awards/markers remain intact.

Each fact can also retain an immutable versioned safe event context and digest.
It contains only the supplied scalar projection and explicit contribution pointer;
it does not copy an unrestricted legacy payload or infer the contribution from
the first matching fact. Exact equality checks the context as well as fact fields,
not only a hash. A fact first supplied as predecessor context may have no event
projection. Its immutable record is not silently upgraded: legacy delivery then
fails closed and a qualified command is required.

## Ordering and existing writers

Compatibility guards cover both the canonical resource coordinate, when present,
and `@event`/canonical event ID. An independently eligible event contribution may
use the latter even if its envelope also names an aggregate. Producer-qualified
scope guards follow compatibility guards; sorted user/achievement and award
revocation guards follow them. Manual grants retain their pair guard and remain
unbound. Individual revocation rereads its immutable binding under the applicable
compatibility guards before selecting the qualified guard.

All rule grants, manual/individual revocation, reviewed mapping and source
retirement participate in this order. A higher target is recorded before new
eligibility. Each rule rereads the guarded source state, so a withdrawal between
two committed rules prevents the remaining old-cycle grant. Legitimate successors
establish eligibility under unchanged repeatability, cooldown, UTC daily caps and
event/rule markers; they do not guarantee a new grant or reset unrelated awards.
Existing Audit/Outbox grant and revocation payloads are retained.

Public administrative source rollback deliberately keeps its existing broad
all-current-matches semantics and response. It is not advertised as a64-row API.
Unversioned internal rollback is refused for enrolled/bound sources, including
event-bound grants whose original envelope named a resource. Unknown failures
preserve identity; only owned qualification conflicts become bounded BLOCKED codes.

## Bounded progress and legacy compatibility

Inventory and retirement each select at most64 history rows using stable indexed
keysets. Revoked bindings count toward work; there is no active-row anti-join
that scans an arbitrary historical prefix before LIMIT. A nonempty page commits
its frontier and returns CONTINUE. Final STABLE/applied-target advancement requires
the subsequent empty indexed window. Across multiple scopes the call returns on
the first nonempty page, sharing the work allowance. Fact and reviewed-mapping
metadata batches are separately limited to64 before persistence.

Inventory includes every RULE grant in the resource/event coordinate. Missing
reviewed mappings return BLOCKED_LEGACY_MAPPING before retirement. Reviewed
mappings are immutable and audited; a covered late mapping resets the retirement
frontier under a new generation, including a previously empty STABLE prefix.
Retirement batches read guarded award projections together, then commit each new
revocation with its Audit/Outbox evidence and the persisted frontier atomically.

For enrolled sources the legacy consumer uses the stored safe context and explicit
pointer, never new caller payload fields. Unknown/unproven identities are blocked.
If owner work remains, its old void facade raises an owned continuation-required
error instead of pretending completion. Future automatic orchestration must use
the qualified outcome and implement durable continuation/wake-up handling in C2/C3;
O1 does not add that coordinator. Unenrolled legacy delivery remains available,
with an in-transaction recheck against concurrent enrolment.

## Verification and limits

The focused migrated matrix covers withdrawal-first, successor-before-withdrawal,
late/repeated original and withdrawal, concurrent delivery, partial-rule success,
real PostgreSQL-confirmed revoke/retirement blocking in both orders, exact-fact
conflicts, producer separation, reviewed legacy mapping, manual preservation,
failed evidence rollback, superseded targets, event-only contributions and existing
rule policies. Synthetic actors/facts are local fixtures, not a producer journal
or proof that real automatic delivery is connected.

Query-work fixtures cover0/1/64/65/1024 grants. The1024 case contains512 already
revoked bindings, examines16 inventory and16 retirement pages, then finalizes at
the empty frontier. Fresh repository instances use persisted progress; this is
not an OS process-crash experiment. Each page retains a512 client-SQL-statement
budget and unchanged transaction timeouts. Trigger-internal statements are not
counted by client query capture. EXPLAIN uses the actual production SQL factories,
without forced indexes: small bitmap plans may filter at most one64-row population;
the1024 history must use its named index and reject historical-prefix filtering.
No measured fixture time is a production latency SLA.

Retained diagnostic evidence includes the first522-statement batch failure,
corrected by one guarded projection read rather than64 reads, without increasing
the512 budget. A later query-plan failure exposed PostgreSQL's legitimate bitmap
choice for a64-row population; the test now distinguishes that bounded small
population from the large-history requirement. Earlier storage-fixture omissions
and these failed logs remain in the local O1 proof record; no retry-to-green claim.

The first CI on `e783a33` passed API coverage1483/1483 but E2E772/773: the existing
award-atomicity test still observed `repository.dailyCount` after that private
method moved into `ruleAwards`. Its observation now targets the real owned writer;
the same PostgreSQL lock wait, quota reads `[0,1]`, AWARDED/CAPPED results and exact
award/marker/Audit/Outbox assertions remain. The first red log is retained. A local
gate on that old head was explicitly cancelled during lint once this CI failure
was known; it is an interrupted run, not a completed E2E failure or a passing gate.

Current focused evidence and exact-head full gate/CI/acceptance are recorded in
the PR and local `tools/agent-helpers/debt090-o1-runtime-proof.local.json` receipt.
Only the disposable loopback5434 `dss_test` database receives the migration during
local verification. Development DB data and frontend are outside this package.

## Still open

O1 does not close DEBT-090, DEBT-007 or D7. A real producer journal and owned read
contract, canonical root admission, reviewed pre-cutoff legacy mapping, durable
continuation, configuration/cycle preflight, queue integration and separately
accepted activation remain required. No automatic awards, historical replay,
Points formula, Levels hop or frontend implementation is enabled here.
