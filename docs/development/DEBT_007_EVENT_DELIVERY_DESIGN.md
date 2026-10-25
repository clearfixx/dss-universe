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

No source runtime, queue consumer identity, database schema, scoring formula or
Phase11 behavior changes in this design checkpoint. Characterization tests and
full package quality/CI remain to be added and verified. No broad Phase8 or D7
acceptance follows from this document.
