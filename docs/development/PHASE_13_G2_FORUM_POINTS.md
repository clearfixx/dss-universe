# Phase 13 G2 — Forum as a qualified Community Points producer

Status: implementation package under review. Stacked on CH-5b
(`phase/13-ch5b-search-activity`); not an accepted baseline. Design and owner
answers: `PHASE_13_FORUM_POINTS_PRODUCER_DESIGN.md`. Package G1 (event
`authorId`) landed with CH-5b.

## Owner rules implemented

| Rule                                                  | Implementation                                                             |
| ----------------------------------------------------- | -------------------------------------------------------------------------- |
| Topic +5, up to 10 per day                            | rule `forum.topic.created` re-pointed to `forum.topic.created.v1`          |
| Reply +1, up to 50 per day; own-topic replies count   | new rule `forum.reply.created` on `forum.post.created.v1`                  |
| Accepted answer +10, up to 10 per day                 | new rule `forum.answer.accepted` on `forum.answer.credited.v1`             |
| A post earns the answer bonus once                    | write-once `firstAcceptedAt/firstAcceptedById`; one `credited` event       |
| Changing the answer: both authors keep/earn +10       | each post's first acceptance is credited; nothing is withdrawn             |
| Points are never revoked (hide, delete, trash, purge) | profiles have no WITHDRAW event; rows are never deleted, evidence survives |
| Votes never touch points or reputation                | no vote event is registered as a producer                                  |

## Deviation from the design: answer credit event

The design proposed re-aggregating `forum.answer.accepted.v1` on the accepted
`ForumPost`. That does not work with the qualified pipeline:

- source cursors are keyed by `(producer, sourceType, sourceId)`, so a reply and
  an answer bonus on the same `ForumPost` would collide on one cursor;
- the canonical reader cannot tell the first of several acceptances apart
  (candidates are bounded and not ordered by time).

Instead, the first acceptance of a post sets write-once columns on
`forum_posts` (immutability trigger) and emits one
`forum.answer.credited.v1` event on aggregate `ForumAnswerCredit` (id = post
id), with payload `{ postId, topicId, authorId }`. `forum.answer.accepted.v1`
is unchanged and still feeds Activity and audit.

## Boundaries

- Forum publishes `PrismaForumContributionReader` through the guarded
  `@api/modules/forum/infrastructure` entry (same pattern as comments), read
  inside the admission transaction; it never returns content.
- The root `SourceProducerAdapter` admits Forum events only when exactly one
  canonical creation event exists, the payload author equals the owned author,
  the actor is the author (topic, reply) or the first acceptor (answer), the
  acceptor is not the answer author and the reply is not post #1.
- Profiles `forum.topics`, `forum.replies`, `forum.answers` are registered;
  `community.topic.created.v1` is no longer dormant.
- Activation stays the trusted operator command with its cutoff; no
  historical forum activity is backfilled.

## Verification

- `forum-points` e2e through the real AppModule, routing, admission seal and
  Points owner: +5/+1/+10 to the right authors, the acceptor earns nothing,
  idempotent replay, one credit per post across answer changes, immutable
  first acceptance, points kept after purge and a late admission still
  verifies, own-topic reply +1, rules and limits as approved (4/4);
- related e2e (gamification, points, achievements, levels, forum, app boot):
  312/313; the one failure (`gamification-routing-persistence`, 5 s
  `afterEach` hook timeout) passes alone 20/20, with and without this change;
- unit 678/678 (composition, Points, Achievements, Forum); lint and typecheck
  clean; migration drift 0; architecture inventory 0 findings;
- full API e2e (5435/6381, Redis-6380-pinned suites excluded): 994/994, 94/94
  suites.

🪙 Points reward contributions; the ledger remembers why.
