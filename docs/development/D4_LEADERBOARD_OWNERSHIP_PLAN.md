# D4 — Leaderboard statement ownership

Date: 2026-10-16. Foundation branch `debt/d4-leaderboard-characterization`,
based on `bb57015` / draft PR #27 (unaccepted).
Status: current behavior characterized; one-SQL runtime direction owner-approved
on 2026-10-16. DEBT-060 correction approved as a separate subsequent package.
Runtime transfer implemented on `debt/d4-leaderboard-runtime-ownership`; verification
and CI/review acceptance must be recorded before treating the packet as accepted.
Foundation gate evidence: [characterization checkpoint](../audits/D4_LEADERBOARD_CHARACTERIZATION.md).

## Current proof

Fourteen isolated migrated PostgreSQL cases pin the production repository, not a
reimplemented query or a successful provider stub. Each case owns a fresh schema;
immutable ledgers remain protected. Every read is one parameterized WITH statement.
Whitespace-normalized pre-transfer SQL fingerprints pin both bounded and all-time
forms, including placeholder positions. SQL structure changes require explicit
review, not an automatic snapshot update. Parameter values also need runtime unit
assertions; a fingerprint alone does not prove the values were bound correctly.

Coverage: empty population; equal points ordered by account age then immutable ID;
zero and negative balances; all four account states; inclusive time boundaries;
signed period/all-time sums; all-time levels; viewer outside and beyond the page;
missing viewer; active/revoked/disabled selected titles; signed reputation through
endsAt; live title disable and account deactivation on subsequent reads; exact
safe public card fields. Legacy DEBT-060 is explicitly a characterization, not
desired pagination behavior or a silent fix. No HTTP guard redesign is claimed.

## Approved runtime boundaries

Use the existing semantic Leaderboards query/window values. A Leaderboards-owned
row-facts input receives only allowlisted scalar ranking facts (numeric rank/total/
points/reputation, opaque ID, public profile/title fields). Root infrastructure
normalizes SQL bigint representation and allowlists fields; no Prisma row/client,
status, credentials, SQL fragment or generic query callback crosses business ports.
Leaderboards retains rank/page/viewer interpretation and response mapping, including
level fallback, selected-title truthiness and existing Number conversion behavior.

| Owner               | Narrow guarded technical contribution                                               |
| ------------------- | ----------------------------------------------------------------------------------- |
| Auth                | physical subject source, opaque ID, createdAt tie evidence and ACTIVE predicate     |
| Users               | only existing username/displayName/avatarUrl selection                              |
| Community Points    | signed period and all-time aggregation bodies with current time predicates          |
| Reputation          | signed recipient totals through endsAt                                              |
| Levels              | highest qualifying definition lookup; threshold/order/LIMIT algorithm remains owned |
| Custom Titles       | selection/grant/definition joins and unrevoked/active predicates; display columns   |
| Leaderboards        | rank/window/page semantics and safe business response mapping                       |
| Root infrastructure | fixed assembly of those named fragments into the original statement                 |

Reuse the approved guarded infrastructure entry pattern, not foreign application
imports. Small operation-specific SQL functions may accept a root-supplied trusted
Prisma.Sql expression for a correlated balance or subject ID; this stays entirely
inside infrastructure. Never accept user-provided identifiers/raw SQL strings,
use Prisma.raw, expose a generic SQL factory or copy another owner's algorithm
into root. Fixed aliases and field allowlists must be explicit and tested.

Auth/Users still share one physical row: compose owned field/predicate fragments
on the original users alias, not two independent queries or extra profile joins.
Do not add ID/existence pre-reads or eligibility caches. Preserve one statement's
visibility, current logical SQL shape/bindings, aliases, inclusive bounds, signed
ledger semantics, zero-point ACTIVE inclusion, row-number ties and viewer OR clause.
No extra transaction, isolation/timeout change, materialized score or scoring rule.

Owner confirmed this exact one-statement direction. Approval is not a claim
that this runtime package is already delivered. Existing
public LeaderboardsService exports remain a separate D4.4 surface review.

## Verification and separate corrections

Before/after run all fourteen golden cases unchanged, exact generated query and
binding checks, owner fragment/mapping unit coverage, provider failures and AST
no-foreign-persistence/public-surface checks. Run the full project gates including
full API E2E. Keep initial failures and bounded repeats distinct; no deadline,
ledger/history-protection or fixture-isolation weakening. Full CI/review/owner
acceptance remains separate from local tests.

DEBT-060: current out-of-range page returns total=0 when no viewer row is returned,
even with an active population. Owner approved correction separately after ownership,
retaining one SQL view and ranking. Do not smuggle that behavior change into the
ownership diff. DEBT-059 schema-write and DEBT-045 shared-fixture/News failures are
separate D6 work, not reasons to suppress broad tests.

The exhaustive SQL/Worker matrix is still required before D4.5 acceptance. This
confirmed multi-owner path is characterized as part of that review, not a
substitute for the remaining matrix. D4.4/D4.5, D5–D7, stack audit and mandatory
Phase 11 brainstorm remain. No Phase 11 implementation.
