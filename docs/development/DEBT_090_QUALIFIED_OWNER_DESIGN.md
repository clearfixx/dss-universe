# DEBT-090 — Qualified achievement commands and bounded retirement

Date: 2026-11-08. Reviewed source: accepted main `417fe99` (PR144).
Status: design accepted in PR146 at `f3e950e`, merged as `fa043a3`.
That package added no migration, production command or activation.
The owner subsequently authorized the separate inactive O1 implementation;
see its [accepted inactive runtime and verification boundary](DEBT_090_QUALIFIED_OWNER_RUNTIME.md).
O1 was accepted in PR147, merged as `a31b5fd`. Specification language below
remains the accepted design; real producer/admission work remains separate.
This makes the accepted [C1 protocol](DEBT_007_CONSUMER_PROTOCOL.md) concrete for
Achievements. Approval of this document is separate from runtime implementation.

## Current evidence and the compatibility boundary

| Current source                                                               | Observed contract                                                                                                         | Consequence                                                                                           |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `achievements/application/services/achievements.service.ts`                  | `consume` returns early on unversioned rollback payloads; otherwise iterates rules                                        | New control facts and an independently eligible contribution need separate processing                 |
| `achievements/infrastructure/repositories/prisma-achievements.repository.ts` | Per-user/achievement award lock and event/rule marker; source rollback uses a different lock and scans all active matches | Neither a durable absent-source withdrawal nor bounded retirement exists                              |
| `achievements/infrastructure/repositories/prisma-manual-award.writer.ts`     | Manual grants have no source binding and use the same user/achievement award lock                                         | Keep manual grants outside inferred source retirement                                                 |
| `achievements/presentation/graphql/resolvers/achievements.resolver.ts`       | Public administration exposes manual grant, individual revoke and broad source rollback; no public event-consume mutation | Preserve those transport contracts; internal legacy consumption needs an explicit enrolled-scope rule |
| `news/infrastructure/repositories/prisma-news-workflow.repository.ts`        | Conditional editorial update, decision and Outbox share one transaction                                                   | A source-owned fact can join that transaction after separate approval                                 |
| News workflow service and `NewsEditorialAction`                              | Publication exists; withdrawal/republication workflow does not                                                            | Do not invent withdrawal endpoints or use editorial revision as a lifecycle sequence                  |
| `reputation/infrastructure/repositories/prisma-reputation.writer.ts`         | Change/reversal already commit with Outbox; reversal identifies `reversesEntryId`                                         | A real reversible producer is available for the later integration proof                               |

Paths in this table are relative to `apps/api/src/modules/`. Inspected schema:
`apps/api/prisma/schema.prisma`, AchievementDefinition/Rule/Award/Revocation.
The existing unique award key is achievementId+sourceEventId, not qualification.
The legacy migrated characterization remains evidence of the defect, not proof
of the proposed command. No new performance or concurrency result is claimed here.

## Ownership and the command boundary

Achievements owns eligibility, source-consumption state, bindings, retirement,
markers, grant/revocation evidence and its private repositories. The producer
owns its lifecycle journal; root composes its narrow fact view with canonical
Outbox identity and later seals an admission. No feature imports another
feature's service, Prisma client, DTO or repository. Root owns no eligibility SQL.

Proposed named capability: `QualifiedAchievementConsumer.advance(command)`.
It accepts only the reviewed safe event projection plus producer-attested facets
from C1, not arbitrary event JSON or a caller-selected repository. It has no HTTP
endpoint. Named interfaces/tokens are exported; concrete services remain private.
TypeScript branding alone is not verification: root must validate the registered
producer view against canonical producer/event/scope/version before invocation.
Durable admissions and actual root verification belong to C2, not this packet.

Control and contribution are explicit facets. A withdrawal can retire one source
while a configured rule rewards the withdrawal event itself. That contribution
has its own producer-declared immutable qualification scope; it is not awarded
against the withdrawn qualification. Acquire all involved scope guards in sorted
tuple order. There is no early-return shortcut that silently drops valid rules.

The outcome is one of:

| Outcome    | Meaning for later root orchestration                                                                             |
| ---------- | ---------------------------------------------------------------------------------------------------------------- |
| `COMPLETE` | This invocation's control reconciliation and eligible rule work finished, including legitimate no-ops            |
| `CONTINUE` | Durable owner work remains; return an opaque cursor generation, not an award count; owner-complete remains false |
| `BLOCKED`  | Bounded code such as FACT_CONFLICT, LEGACY_FACT_REQUIRED or BLOCKED_LEGACY_MAPPING; no fabricated success        |
| exception  | Unknown/infrastructure failure; preserve error identity internally and let technical retry policy decide         |

New commands preserve recipient existence, rule ordering, repeatability, cooldown,
daily caps and live rules for unmarked work. Preserve event/rule marker identity,
award sourceEventId and existing Audit/Outbox payloads. A new cycle establishes
eligibility; it never guarantees an award or resets unrelated active awards.

## Proposed additive owner storage

The following is a migration specification for review, not committed Prisma/DDL.
All identifiers retain opaque, case-sensitive string semantics. No conversion
of source IDs to UUID, trimming or timestamp-based revision assignment. Lifecycle
revisions use positive PostgreSQL bigint and canonical decimal wire strings;
reject overflow, zero, signs, fractions and leading-zero aliases. Compare bigint,
never JavaScript Number. Coverage may be zero only for the initial qualification.

| Record                          | Fields and constraints                                                                                                                                                                                                                                                                                                                              |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AchievementSourceCursor`       | Surrogate ID; unique producer/sourceKind/sourceId; appliedRevision/current qualification; highest accepted target fact/revision; retiredThrough; pendingRetiredThrough; phase STABLE or RETIRING; verified legacy-enrolment state; retirement frontier (qualification revision, awardId); monotonically increasing generation and progress sequence |
| `AchievementSourceFact`         | Immutable cursor FK, factId, canonicalEventId, revision, action, qualificationId, qualification revision, retiredThroughRevision, predecessor withdrawal identity and codec/digest; unique scope+revision and producer+factId; exact replay equality includes every bound field                                                                     |
| `AchievementAwardQualification` | Immutable unique award FK, cursor FK, qualification fact FK and revision, canonical sourceEventId; verified legacy mappings also retain mapping-evidence identity/digest; no user-controlled free-text metadata                                                                                                                                     |

Use FKs/RESTRICT and database checks for nonnegative coverage, positive revisions,
ordered applied/target revisions and coherent phase/nullability. Immutable facts
and bindings reject update/delete through database guards, not repository
convention alone. A canonical event may legitimately carry multiple facets;
therefore eventId alone is not a unique fact key. Conflicting fact reuse is
checked before stale/replay disposition. Store structured tuple columns; derive
lock coordinates from unambiguous tuple encoding, not delimiter concatenation.
Hash collision may serialize unrelated scopes, never merge their identities.

Required indexes: unique scope; scope+revision/fact lookup; binding cursor+
qualificationRevision+awardId; existing award source/event indexes retained.
The migration review must validate actual key widths and query plans; no truncated
identifier or digest-only identity substitutes for equality checks. No historical
award rewrite, processed-marker deletion or source-event replay is allowed.

## Retirement transaction and continuation

Propose an initial hard per-transaction ceiling of **64 examined bindings**.
Inventory and retirement phases do not run population loops in the same call;
each nonempty page returns CONTINUE. For multi-facet commands the64-row allowance
is shared, not multiplied by facet count. Facet count is descriptor-bounded and
must be checked before locks; it cannot come from an unrestricted caller array.
This is a work bound, not a measured latency promise and not a total result cap.
The runtime package must measure it before acceptance; lowering it preserves
semantics through continuation. Increasing timeout or dropping remaining rows
does not satisfy the budget. Existing transaction timeout/isolation stay in place.

1. Validate the attested fact and immutable binding. Lock the involved source
   scopes, reread cursor/facts and compare exact identity before revision order.
2. Persist a higher target and retirement coverage, increment generation and
   enter RETIRING before new-cycle eligibility. Keep appliedRevision/current
   qualification unchanged while any covered active binding remains. A withdrawal
   with no prior award is still recorded durably.
3. In the next bounded transaction, hold the source guard and select at most64
   covered bindings after the persisted frontier, ordered by qualification
   revision then awardId using the matching index. Include already-revoked rows;
   do not use an anti-join that scans unlimited revoked history to find64 active
   grants. Each examined row consumes one unit of the64-row work allowance.
   Lock their distinct user/achievement pairs in deterministic tuple order,
   then individual award coordinates in deterministic order. Reread revocations.
4. Write each still-needed immutable revocation and its existing Audit/Outbox
   evidence, with frontier/progress in the same transaction. If evidence fails,
   that whole batch rolls back. Already committed batches remain historical.
5. Return CONTINUE after any nonempty batch. A separate indexed LIMIT1 query
   after the frontier under the source guard installs the latest target as STABLE
   only when the target prefix is exhausted and verified legacy enrolment is READY.
   Finalization and cursor advance are atomic. No active-row anti-join or
   unbounded count is part of that query; prove the actual index plan.
6. After STABLE, execute each eligible rule in its existing separate transaction.
   Reacquire all relevant source guards, verify the command still qualifies,
   then the user/achievement guard, existing marker/eligibility checks, grant,
   binding, marker and evidence. No marker is written merely for waiting on
   RETIRING. A superseded old-cycle contribution cannot award on replay.

No transaction loops over all grants. A later invocation uses persisted phase,
generation and rows, not a process-local offset. No long-held lock crosses
invocations. A newer verified target can supersede RETIRING: increase retirement
coverage monotonically, increment generation and continue against the new target.
Never finalize an older snapshot. Lower/equal exact facts cannot reduce coverage;
equal conflicting facts are BLOCKED before any write. If a new target arrives
after a finalizing transaction, the source guard serializes it after that commit.

No covered award may be inserted behind the frontier. Qualified writers reread
the source guard/state; stale cycles cannot write. An approved late legacy mapping
at or behind the frontier atomically resets that frontier and reenters RETIRING
before returning; a previously STABLE cursor cannot keep its completion claim.
No mapping producer may bypass this command. A higher target retains completed
prefix progress when coverage only grows and no such insertion has occurred.

The owner generation is not a queue lease or authority token. A stale caller may
help advance only the reread current durable target; it may not restore an old
target. Distinct invocations can duplicate technical work but source guards and
existing markers fence economic effects. Retirement is eventually complete once
new source changes stop and continuation is serviced; no fairness guarantee is
claimed under an infinite stream of superseding source changes.

CONTINUE is normal progress, not a failed attempt and not COMPLETE. C2/C3 must
persist the next wake-up before acknowledging technical work, maintain the owner
incomplete flag, apply soft pause to new claims, and recover a lost wake-up.
Successful progress cannot spend the five-failure budget. Repeated no-progress,
exceptions and scheduling failure need separate bounded operational reporting;
no busy loop, sleeping worker, lease extension or broker-only cursor is allowed.
The root continuation protocol must be implemented/reviewed before activation.

## Lock order and coexistence with existing commands

Common order: sorted legacy sourceKind/sourceId compatibility guards → sorted
producer/source scopes → sorted user/achievement pairs → sorted award revoke
coordinates. The first guard has an unambiguous encoding and is shared by
enrolment, legacy consumption and broad administration. It prevents a scope from
being enrolled between a legacy writer's lookup and write. Broad rollback reads
all matching enrolled producer scopes only after this guard; different producers
can serialize here without becoming the same source identity. No global lock
over unrelated sources is introduced. Multi-facet operations acquire all their
compatibility guards before any producer-scope guard.

New qualified/mapping writes and every existing writer
that touches an enrolled source must use this order. Do not acquire a source
guard after a pair/award guard. An individual revoke first performs an unlocked
ID-only coordinate lookup, then acquires guards and rereads the row; the first
lookup never determines the mutation. Preserve existing not-found/conflict and
successful transport responses. Unique revocation constraints remain a backstop.

Manual grants stay unbound and keep the pair guard. Administrator broad
rollback remains a deliberate current-source command, including qualified awards,
with its existing reason/actor/result contract; it is not converted into a
producer fact and cannot manufacture a new lifecycle revision. Automatic delivery
never invokes it. Its legacy unbounded response/transaction is not advertised as
bounded by the new64-row automatic command. Explicit admin revoke does not erase
event markers, so replay does not silently restore the same grant.

For internal legacy `consume` only, propose this explicit compatibility change:
unenrolled scopes retain current behavior; an enrolled scope requires a reviewed
event→qualification mapping and delegates through the qualified path. Missing
mapping yields LEGACY_FACT_REQUIRED before economic writes/markers. This is not
an existing public GraphQL contract change: no event-consume endpoint exists.
It is nevertheless a behavior change to a named internal capability and needs
explicit runtime approval and assembly regression tests. Do not silently deploy
it under approval of this design or leave a legacy writer bypassing the barrier.
The current normalizer drops producer, although IntegrationEventJob contains it:
retain the original producer for enrolment lookup. Never infer it from eventName
or merge same sourceType/sourceId across different producers.

Existing source-bound RULE awards are mapped only from exact canonical
event+producer evidence or an owner-reviewed mapping manifest. The binding,
evidence and source guard are atomic; no historical awards/markers are rewritten.
An ambiguous active legacy award blocks source finalization. Mapping is not
inferred from nearest timestamps, current recipient or mutable source state.
Manual/unbound grants are not swept into guessed source rollback. Enrolment is
READY only after a durable bounded keyset inventory of existing source RULE awards
(including revoked rows) has either verified their mappings or explicitly blocked
that source. Persist its inventory frontier on the cursor; examine at most64 awards
per invocation. The enrolled-scope legacy rule applies from inventory start, so a
late unqualified insert cannot escape the completed inventory. Mapping writes,
inventory progress and source guards share the owner transaction. Preflight lists
blocked sources; no whole-history scan is hidden in the final retirement check.
A new valid withdrawal may retire a pre-cutoff award with verified evidence.

## Producer implementation sequence

Each supported producer needs its own private pointer/journal and narrow named
fact-reader. Its aggregate mutation, next revision, immutable fact and canonical
Outbox envelope commit together under that owner's existing transaction/guard.
Root infrastructure composes owners; no Achievements query reads producer tables.
Existing v1 names/rule keys remain. Sidecar facts do not forward title/body/reason,
profile facts, credentials or unrestricted JSON into economic commands.

Use actual Reputation change/reversal transactions for the first reversible
integration proof. The reversal facet targets the original entry's qualification;
its separately configurable contribution remains independent. This is not a
timestamp-derived order and does not authorize changing current Points formulas
or recipient rules. Its exact owner persistence extension remains a distinct
reviewed implementation stage. Comment deletion and News withdrawal must not
acquire new economic policy merely because their names sound like reversal.

News publication can expose an immutable publication fact after review. A future
withdrawal/new-publication cycle needs a real News-owned transition before it can
supply that lifecycle contract. Keep unavailable descriptors explicitly blocked;
do not activate an incomplete producer set or claim synthetic cycles prove News.

## Proposed implementation packets and proof obligations

| Packet                      | Concrete changes to approve separately                                                                                                                                               | Required proof                                                                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| O1: owner runtime, inactive | Three additive Achievements tables/constraints, private qualified command and bounded retirement, named capability, existing-writer lock participation, enrolled legacy-consume rule | Migrated DB schedules below; immutable-history guards, mapper/transport compatibility, failed evidence rollback; assemblies stay singleton and no automatic work starts |
| P1: producer facts          | First real Reputation-owned journal/pointer/read contract in current change/reversal transactions; root adapter through owner contracts                                              | Canonical Outbox/fact atomicity, rollback failure, duplicate change/reversal, actual owner→qualified path and pre-cutoff legacy mapping                                 |
| C2/C3 and D                 | Accepted C1 admission/continuation/configuration, actual queue and two-hop Points→Levels, isolated operations/activation                                                             | Persisted wake-ups, lost hints, pause/recovery, failure/progress budgets, safe projections and all existing C1 acceptance requirements                                  |

Before O1 runtime acceptance, deterministic DB tests must cover withdrawal-first;
successor-before-predecessor-withdrawal; lower-revision replay; conflicting equal
facts; duplicate qualification; withdrawal between rule commits; stale root
attempt after owner commit; partial batch+restart; newer target mid-retirement;
concurrent individual/admin revoke; preserved manual grants; mapped pre-cutoff
awards; ambiguous mapping with no premature STABLE/marker; and unchanged policy.

Measure64-row transactions and indexed empty/nonempty selection on at least
0/1/64/65/1024 synthetic bindings, including already-revoked rows. Record actual
query plans, rows examined, locks, query counts and latency against unchanged
timeouts; include64 awards across distinct pairs and actual evidence writes.
Passing small fixtures or a count-free LIMIT alone is not a performance proof.
If plans scan unbounded history, revise the index/active-binding design before
runtime acceptance; do not hide it by raising a threshold.

O1 alone does not close DEBT-090: closure also requires the real producer/admission
boundary, reviewed legacy handling and source-order proof through that path.
No new feature formula, owner role/Command Deck work, frontend, historical replay,
queue activation or Phase11 code is included. This design still needs its own
full gate, CI and owner acceptance; it inherits no passing result from PR144.
