# DEBT-007 — C2.1 inactive persistence implementation

Baseline: accepted protocol PR152 / main `b1ab8d2`.
Status: implementation in progress, not accepted, not activated.
The owner separately authorized runtime C2.1 after accepting the protocol.

## Implemented checkpoint

Root-owned constants/types and five Prisma models are present. The additive
`20261109100000_gamification_consumption_persistence` migration creates admission,
receipt, attempt, progress and admission-rejection tables, restrictive FKs and
due/recovery indexes. It preserves all historical migrations and existing tables.

SQL checks enforce closed states/codes, claim field coherence, bounded counters,
digest shape and size metadata. Triggers reject seal/rejection mutation, deletion
of retained receipt/attempt/progress, backward owner flags, invalid receipt
transitions, epoch changes and settled-attempt rewrites. Cross-record current
token authority still belongs to transactional repositories; these guards are
not a substitute for CAS or producer attestation.

No App import, runner, broker operation, owner call or automatic award is added.
The new DDL has only run in isolated disposable schemas through the established
migration fixture; no public/dev migration deployment is claimed at this stage.

## Current evidence

- Prisma validation passed for the five models; contract typecheck passed.
- Initial storage suite passed14/14; expanded migrated suite passed17/17 on
  isolated Node24.18.0, without changed test timeouts or retries.
- Expanded cases cover seal immutability/identity/shape, receipt transitions,
  completion/failure separation, fifth-failure blocking, settled attempts,
  progress identity and distinct immutable rejection history.
- Actual logs:
  `node_modules/.cache/debt007-c21-storage-d184ea3c8c4444199b9bad60dbe92dc3.log`
  and
  `node_modules/.cache/debt007-c21-storage-36d75e3b43d84beaba2d84fd33a5ae93.log`.
  Matching per-run receipts are under `tools/agent-helpers/`.

The tests deliberately use minimal storage fixtures, not a certified codec seal.
They do not prove current-claim admission, queue delivery, owner effects,
configuration compatibility, full release quality or closure of DEBT007/090.

## Observed local toolchain interruption

During implementation, the executable resolved from the global Node location
reported24.22.1 instead of the repository's24.18.0. The global pnpm shim failed
with MODULE_NOT_FOUND for its Corepack pnpm entry. No cause/actor is attributed.
An earlier validation invocation also lacked DATABASE_URL and stopped before any
database access; supplying a local configuration URL resolved that check.

The helper `tools/agent-helpers/gamification/prepare-pinned-node.ps1` fetched an
isolated24.18.0 binary from nodejs.org and checked its official SHA-256:
`9a4eb5f1c29c6a2e93852ead46b999e284a6a5ca8bab4d4e241d587d025a52de`.
Runtime artifacts live in a rebuildable dependency cache; authored helpers remain
under `tools/agent-helpers/gamification/`. The local pnpm launcher uses the existing
11.9.0 package with that verified binary. Global installation, power settings and
the frontend worktree were not changed. This is a verification workaround, not a
claim that the global pnpm installation has been repaired.

## Strict codec checkpoint

The root codec now copies a closed, descriptor-specific Reputation projection,
checks exact keys/plain records/dense arrays and rejects property accessors
without invoking them. It preserves Unicode without normalization, rejects lone
surrogates, enforces per-string UTF-8 limits and measures the canonical encoding
against256 KiB. Recursive ordering sees validated, copied, bounded data only.
SHA-256 and encoded byte length are verified again on stored JSONB load.

The first inactive descriptor supports the existing qualified Achievements input,
including up to three P1 facts and the existing bounded reviewed-mapping shape.
Its Points/Levels applicability is explicitly false. This does not implement
Points facets or authorize production activation of a Reputation-only route;
complete owner prerequisites and producer/configuration coverage remain C2.2/C2.3.
Codec acceptance is shape/integrity validation, never producer attestation.

Unit regressions passed25/25 initially and28/28 after expanding canonical-order,
three-fact/optional-mapping and cyclic-input cases. They cover getters, prototypes,
symbols, sparse/accessor arrays, malformed signed values and identities, Unicode,
exact16 KiB/256 KiB boundaries and digest/length/projection tampering. Logs:
`node_modules/.cache/debt007-c21-codec-0033681f681448b3b3b7ffe37eac099c.log`
and
`node_modules/.cache/debt007-c21-codec-4c1fb50890a04c86b271702cd8029cde.log`.
Initial strict lint found an unnecessary type assertion and two untyped Array.fill
constructions in tests; these were corrected without rule/assertion changes.

## Transaction-bound preparation checkpoint

P1 now supplies `prepareInTransaction` without opening its own transaction; the
existing `prepare` wrapper retains Repeatable Read. The real producer integration
suite passed19/19, including a new schedule that commits a concurrent withdrawal
after the caller snapshot is established. The bound operation observes its
original one-fact view; a fresh preparation sees the new withdrawal. A forbidden
standalone transaction callback is never called. No write isolation or timeout
is changed. Log:
`node_modules/.cache/debt007-c21-producer-007591004bad4c5e9aef596ef93cddc2.log`.

Strict lint initially caught the new snapshot test's untyped bind; the callback
now uses the existing file's explicit reader signature. Lint/typecheck passed
after correction. Architecture checks passed142/142 with the unchanged frozen
inventory; this is boundary-regression evidence, not final D7 acceptance.

## Remaining before package acceptance

Immutable seal reuse; admission/rejection and consumption CAS
repositories; actual-token and concurrency schedules; bounded query plans;
inactive assembly/lifecycle regressions; disposable public deployment/drift;
complete full quality gate, final-head CI and separate owner acceptance.

C2.2/C2.3, C3/D and final D7 remain separate pending work. No historical replay,
frontend change or Phase11 implementation is included.
