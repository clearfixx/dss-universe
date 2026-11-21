# Phase 13 CH-3a — Accepted answers, topic polls and curated tags

Status: implementation package under review. Stacked on CH-2
(`phase/13-ch2-votes-ranking`); not an accepted baseline.

The brainstorm's CH-3 is delivered in two packages:

- **CH-3a (this package):** question topics with accepted answers, one shared
  poll per topic, curated tags per forum;
- **CH-3b:** Media attachments with ownership checks and Content Gates in
  forums flagged for gated content, with server-side redaction.

## Owner rules implemented

| Rule                                                                    | Implementation                                                        |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Author, curator or moderator marks the accepted answer                  | `assertCanAcceptAnswer`                                               |
| Only a moderator changes (or clears) an accepted answer                 | same rule + `clearForumAcceptedAnswer`                                |
| Accepting does not close the topic                                      | state untouched                                                       |
| Bonus points go to the answer author                                    | `forum.answer.accepted.v1` carries `answerAuthorId`; awarding is CH-5 |
| Polls: shared module; open/anonymous per poll; no deadline; final votes | P-0 via `POLL_COMMANDS`                                               |
| Curated tag list per forum                                              | `forum_tags`, managed by category moderators                          |

## Decisions taken in this package (reviewable)

- **No self-accepted answers.** The topic author cannot accept their own
  reply; otherwise the accepted-answer bonus (+10) could be self-awarded.
- **Polls are attached to an existing topic** by its author (or a moderator)
  while the topic is open, instead of inside topic creation. This keeps Poll
  creation in the Interaction Platform without a cross-module transaction; the
  Interaction Target uniqueness guarantees one poll per topic.
- **Tags** follow the first-post edit rule: the author sets them until a curator
  is assigned; curators and moderators afterwards. At most five active tags
  from the forum's own list; inactive tags disappear from topic views.

## Scope

- `forum_topics.acceptedAnswerPostId` (+ actor/time); database rules: only
  `QUESTION` topics, the answer is a reply of the same topic;
- `forum_tags`, `forum_topic_tags`; database rule: a topic only carries tags of
  its own forum;
- GraphQL: `acceptForumAnswer`, `clearForumAcceptedAnswer`, `forumTags`,
  `createForumTag`, `updateForumTag`, `setForumTopicTags`,
  `attachForumTopicPoll`; topics expose `acceptedAnswerPostId` and `tags`;
  `forumTopics(tagSlug)` filters every sort including `HOT`/`TOP`.

Forum never reads Poll tables; it calls the published `POLL_COMMANDS`.

## Verification

- Prisma format/validate and zero schema drift;
- curation rule unit tests;
- migrated-database e2e: accept/change/clear authority with events, database
  guards for discussions, tag curation and limits with filtering (including
  ranked sorts), inactive tags, one poll per topic and author-only attach.

Recorded local results (2026-11-21, Node 24.22.3, dedicated `5435`/Redis `6381`):

- migrations applied; zero Prisma schema drift;
- API unit suite: 1662 passed, 106 skipped by the existing opt-in policy;
- forum e2e (curation, ratings, topics): 18/18;
- the application boot e2e caught a missing explicit GraphQL type on the poll
  visibility input; fixed in this package before publication;
- full API e2e: 89 suites, 972/972 (five Redis-6380-pinned suites excluded;
  covered by PR #192);
- architecture inventory: 0 findings; lint and typecheck clean.

GitHub CI on the committed PR head remains the acceptance gate.

🏷️ The best answer deserves a pin; the right tag deserves a curator.
