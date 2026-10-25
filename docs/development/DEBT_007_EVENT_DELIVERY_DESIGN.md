# DEBT-007 — Automatic gamification delivery design

Status: owner-approved design and characterization only; runtime not authorized.
Branch: `debt/debt-007-event-delivery-design`, accepted baseline `746d981`.

## Initial source checkpoint

| Boundary                      | Current source evidence                                                                                                   | Limit                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Worker integration dispatch   | `apps/worker/src/main.ts` supplies only `activityProjector.project` to the integration processor                          | No automatic gamification handler is wired here                             |
| Delivery marker               | `packages/jobs/src/index.ts` checks marker, awaits handler, then marks processed; Worker store uses separate pool queries | Not a shared transaction or exactly-once effect guarantee                   |
| Community Points              | `CommunityPointsService.consume` matches owned rules; special reputation reversal path; recipient existence via port      | A direct service test is not producer-to-Worker delivery                    |
| Levels                        | `LevelsService` accepts `community-points.awarded.v1` and `community-points.reversed.v1`                                  | Derived events require a proven second delivery hop                         |
| Achievements                  | `AchievementsService.consume` matches rules and handles source rollback coordinates                                       | Partial rule success, replay and rollback ordering require characterization |
| Root gamification composition | Existing module binds recipient/balance/transaction ports                                                                 | Port wiring alone does not dispatch integration events                      |

This is a bounded initial inventory, not a complete producer catalog or a newly
reproduced runtime defect. Existing DEBT-007 remains open; no formulas change.

## Producer and recipient checkpoint

| Producer evidence                                 | Envelope category | Recipient/payload facts                                              | Current delivery limit                                                                           |
| ------------------------------------------------- | ----------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| News workflow `news.article.${eventStem}.v1`      | domain            | authorId and actorId are distinct; stem derives from workflow action | Dispatcher does not filter category; gamification policy matching still needs explicit inventory |
| Comment writer `comments.comment.${action}.v1`    | integration       | authorId, commentId, interactionTargetId, parentId                   | Do not infer that edit/delete should award the creation rule                                     |
| Reputation writer `reputation.direct.changed.v1`  | integration       | recipientId, signed value; actorId in envelope                       | Recipient is not the voter; configured value filters matter                                      |
| Reputation writer `reputation.direct.reversed.v1` | integration       | recipientId, value, reversesEntryId                                  | Points uses the explicit reversal branch, not a new award                                        |
| Points repository awarded/reversed events         | integration       | userId, ruleKey, points, optional source coordinates                 | Levels consumes these names, requiring another Outbox/Worker hop                                 |

`OutboxDispatcherService` currently selects due PENDING rows without a category
predicate and forwards eventCategory as job.category. Therefore News `domain`
category alone does not explain absent gamification delivery; the missing
gamification handler wiring is a separate observed boundary. No category rewrite
or new event naming convention is authorized by this finding.

Points recipient precedence is userId, then authorId, then recipientId. Its
matchingRules uses eventName and optional integer payload.value. Achievements
uses each configured rule's recipientPayloadKey and optional source rollback
coordinates. These are current semantics to characterize, not permission to
silently normalize all recipients to actorId.

The bounded Prisma seed-source search found no CommunityPointRule or
AchievementRule setup. This is not evidence that a running database has no
configured rules; database configuration inventory remains open and must not
read user content or mutate current rules.

The migration `20260729093000_add_community_points_ledger` supplies six baseline
rules (distinct from seed files):

| Rule                        | Event                          | Value filter | Points | Daily count limit |
| --------------------------- | ------------------------------ | ------------ | ------ | ----------------- |
| comment.created             | comments.comment.created.v1    | none         | 1      | 50                |
| forum.topic.created         | community.topic.created.v1     | none         | 5      | 10                |
| news.published              | news.article.published.v1      | none         | 10     | 5                 |
| knowledge.article.published | knowledge.article.published.v1 | none         | 50     | 2                 |
| reputation.positive         | reputation.direct.changed.v1   | 1            | 10     | 25                |
| reputation.negative         | reputation.direct.changed.v1   | -1           | -10    | 25                |

These are migration defaults, not a fresh inventory of live configured values.
News service supplies actionPUBLISHED, and both manual/scheduled repository
paths therefore emit the matching published event name. Future Forum/Knowledge
producer existence is not inferred from the presence of a baseline rule.
No historical migration, formula or user-configured rule is edited here.

## Required design outputs

1. Enumerate actual source event names/versions, payload ownership, transactional
   Outbox writers and configured rules. Distinguish emitted, consumable and wired.
2. Map consumer identity, marker storage and retry/DLQ behavior per logical
   effect, preserving accepted historical Worker v1 markers and v2 retry history.
3. Characterize failure before effect, after effect/before marker, partial
   multi-rule success, duplicate/concurrent delivery and downstream Points-event
   delivery. Use deterministic controls, not sleeps or claims from mocked calls.
4. Define narrow owner capabilities and root/runtime assembly without importing
   broad foreign services into features or placing policy in Worker SQL.
5. Compare transaction/consumer boundaries explicitly. Do not label sequential
   service calls atomic or promise exactly-once. Audit/Outbox and immutable ledger
   semantics must survive partial failure and replay.
6. Present the event/recipient/reversal matrix and proposed implementation scope
   for owner approval before changing runtime dispatch, formulas or migrations.

## Verification boundary

Worker characterization now runs the actual integration processor with controlled
marker adapters. Four new cases pass together with the existing processor case,
5/5 across two suites: handler failure leaves no marker and retries; marker
persistence failure repeats the completed handler; two controlled absent-marker
reads both invoke the handler; distinct consumer names retain independent markers.
The concurrency schedule uses promise barriers, not sleeps. Worker lint and
typecheck pass. No real queue, PostgreSQL schedule or gamification ledger runs in
these tests, so they do not prove duplicate domain awards. Domain-level dedup,
partial multi-rule rollback and the second delivery hop still need evidence.

The existing Achievements service suite now includes a controlled two-rule
failure/retry case and passes9/9. After rule2 rejects, retry revisits rule1 and
delegates its DUPLICATE decision to the repository, then proceeds to rule2.
This actual-service/repository-double test characterizes orchestration only;
it does not establish that the first award committed in PostgreSQL. Source
inspection places each repository.consume in its own transaction and scoped
event/rule marker. Points instead checks its consumer marker inside the award
transaction and writes entry/marker/Audit/Outbox together. Existing DB suites
must be reconciled with these distinct units before selecting a dispatcher design.

At source `8facfb0`, a new actual-AppModule/private-migrated-schema cohort passes
2/2, exit0, without pending/todo. Real Points entry/owned marker/Audit/Outbox
counts all roll back when Outbox append throws, and retry succeeds. In the second
case a controlled outer processor marker fails after real Points commit; replay
returns Points DUPLICATE without a second entry/Audit/Outbox. The outer marker
adapter is a test double; PostgreSQL Points persistence is real. No queue is
started by this test. JSON SHA256:
`A3D2DCC39C55D5DD17B22AC1154EEE08C354A3C22216AA10EA00F9AD87E6E7E6`.
Read-only post-run schema inventory reports zero `api_boundary_%` schemas.

## Runtime assembly decisions still requiring design

The reviewed ADR-004 and ADR-0003 require source-transaction Outbox plus durable
jobs for secondary effects, owner-local policy and narrow root composition.
Existing queue documentation keeps `apps/worker` a separately deployable runtime;
the current Activity consumer identity and retained jobs remain compatibility
constraints, not disposable implementation details.

| Candidate                                                        | Benefit                                                                            | Cost / acceptance requirement                                                                                                                      |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Additive headless consumer assembled from the API-owned artifact | Reuses existing owner policy/persistence without cross-app imports into ESM Worker | Explicit new process entrypoint, narrow Nest assembly, queue fan-out, deployment/health/DLQ lifecycle and ADR clarification required               |
| Existing Worker calls a private API composition endpoint         | Keeps current Worker deployment shape and owner execution inside API               | New authenticated internal transport, availability coupling, payload replay protection and timeout/failure contract; not an ordinary user endpoint |
| Move owner application/runtime into shared libraries             | Could support independent execution runtimes                                       | Broad packaging migration, decorators/aliases/build compatibility and ownership surface changes; disproportionate as an incidental wiring patch    |

Design preference for further validation: additive headless root assembly, not
an implementation decision. It must demonstrate minimal provider construction
without starting HTTP listeners or unrelated schedulers. No broad service is
exported merely to make this candidate convenient. Existing Activity processing
stays in its original process/queue and retains v1 identity/history.

A second consumer on the same BullMQ queue is not fan-out: it can compete for
jobs. A proposed separate gamification queue therefore needs explicit dispatcher
publication to both destinations, stable event IDs per queue, failure recovery
when only one enqueue succeeds, and operational retry visibility. Original
PUBLISHED cannot be redefined silently. Points and achievement transactions
remain independently idempotent; Levels follows the durable Points event, not
an assumed immediate balance update. These are required design constraints,
not new queue configuration or an exactly-once promise.

The existing Worker is an ESM process with direct PostgreSQL adapters; feature
application services currently live in the Nest API. Importing entire API modules
into Worker or copying scoring logic to Worker SQL is not an approved shortcut.
The design must compare an owner-assembled background consumer runtime against
explicit internal delivery contracts and their authentication/failure boundaries.
Any queue fan-out must preserve existing Activity v1 markers/history, avoid
competing consumers accidentally splitting one event stream, and specify partial
publish/retry semantics. No queue topology change is implemented here.

Activation also needs an explicit historical-event policy: existing Activity
markers cannot be treated as gamification completion, while blindly replaying
all retained events could retroactively award points. Neither automatic backfill
nor silent historical loss is authorized by this design checkpoint.

No source runtime, queue consumer identity, database schema, scoring formula or
Phase11 behavior changes in this design checkpoint. Additional characterization
and full package quality/CI remain open. No broad Phase8 or D7
acceptance follows from this document.
