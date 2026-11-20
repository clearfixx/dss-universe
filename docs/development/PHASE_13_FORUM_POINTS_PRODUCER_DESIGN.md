# Phase 13 — Forum as a qualified Community Points producer (design)

Status: design proposed for owner approval. No runtime, migration, rule change
or activation is part of this document. Implementation follows in separate
packages after approval.

## Owner decisions this design implements

| Activity               | Points | Recipient     | On deletion |
| ---------------------- | -----: | ------------- | ----------- |
| Topic created          |     +5 | topic author  | not revoked |
| Reply created          |     +1 | reply author  | not revoked |
| Accepted answer        |    +10 | answer author | not revoked |
| Forum vote (`+` / `−`) |      0 | —             | —           |

Abuse is handled by moderators (read-only for farming) and the existing
per-rule daily limits; the 60-second posting cooldown already applies.

## How the existing pipeline works (summary)

Community Points accept points only from **registered producer profiles**
(`composition/gamification-delivery/contracts/producer-catalog.ts`). For each
canonical Outbox event, a source-producer adapter in root composition re-reads
the producer's own rows, checks that exactly one matching creation event exists
and that payload, actor and aggregate agree with the owned state, then seals
QUALIFY (and possibly WITHDRAW) facts. The sealed payload contains only the
profile's recipient keys. Activation is a trusted operator command with an
immutable cutoff; nothing before the cutoff is replayed.

The closest existing producer is `comments.lifetime`: no separate
qualification tables, owned rows plus canonical events, QUALIFY at revision 1
and WITHDRAW at revision 2 on tombstone. Forum follows that pattern **without
WITHDRAW**, because deletion does not revoke forum points.

## Proposed producer profiles

| Profile id      | Producer        | Source type  | Event                      | Recipient key |
| --------------- | --------------- | ------------ | -------------------------- | ------------- |
| `forum.topics`  | `dss.api.forum` | `ForumTopic` | `forum.topic.created.v1`   | `authorId`    |
| `forum.replies` | `dss.api.forum` | `ForumPost`  | `forum.post.created.v1`    | `authorId`    |
| `forum.answers` | `dss.api.forum` | `ForumPost`  | `forum.answer.accepted.v1` | `authorId`    |

All three: category `integration`, version 1, `points: true`, `levels: false`.

## Required changes to Forum events (package G1)

The current Forum events were written for audit and Activity; the pipeline needs
exact recipient keys and stable aggregates.

1. `forum.topic.created.v1` — add `authorId` to the payload (aggregate stays
   `ForumTopic`).
2. `forum.post.created.v1` — add `authorId` (aggregate stays `ForumPost`). Post #1
   is part of topic creation and does **not** emit this event, so a topic earns
   +5, not +6.
3. `forum.answer.accepted.v1` — aggregate becomes the **accepted post**
   (`ForumPost`), payload `{ topicId, postId, authorId, previousPostId }` where
   `authorId` is the answer author. Clearing an answer keeps its own event.

Events emitted before activation are never admitted (cutoff), so this additive
change needs no legacy rewrite.

Forum also publishes a narrow, read-only contract for the adapter:

```ts
interface ForumContributionFacts {
  topic(id): { id; authorId; createdAt } | null;
  post(id): { id; topicId; authorId; number; createdAt } | null;
  acceptance(
    postId,
  ): { postId; topicId; authorId; acceptedAt; firstAcceptedAt } | null;
}
```

## Source-producer adapter (package G2, root composition)

For each profile the adapter:

- reads the canonical event by id with the selected safe keys;
- reads the owned fact through `ForumContributionFacts`;
- requires exactly one canonical creation event for that aggregate;
- checks producer, aggregate id, `authorId` and `actorId` (topic/reply author;
  for answers the accepting user, who must differ from the answer author);
- seals one QUALIFY fact at revision 1; there is never a WITHDRAW fact.

Moves, merges and splits change topic or number, not post identity, so they do
not create, move or revoke points. A topic created by **split** has no
`forum.topic.created.v1` event and earns nothing.

## Rules and configuration (package G2)

- Existing rule `forum.topic.created` currently listens to the dormant name
  `community.topic.created.v1`. A forward migration re-points it to
  `forum.topic.created.v1` (+5, daily limit 10 unchanged) and removes the name
  from `DORMANT_POINT_EVENTS`.
- New rules: `forum.reply.created` (+1) and `forum.answer.accepted` (+10).
- Preflight then recognises every enabled rule; activation stays the trusted
  operator command. No historical forum activity is backfilled.

## Verification plan

- unit: adapter mismatch matrix (foreign author, duplicate creation event,
  missing owned row, self-accepted answer, split topics);
- migrated-database e2e through the real broker on disposable Redis: topic +5,
  reply +1, answer +10, no change on hide/delete/purge/move/merge/split, daily
  limits, idempotent replay;
- preflight accepts the new rules; activation remains manual.

## Questions for the owner

1. **Daily limits** for replies (+1) and accepted answers (+10). Proposed: 50
   replies/day (same as comments) and 10 accepted answers/day.
2. **Changing an accepted answer:** the first answer author keeps their +10
   (no revocation). Proposed: the new answer author also gets +10, but a given
   post can earn the answer bonus only once, even if re-accepted.
3. **Administrator purge** (legal/security removal): proposed to keep the
   points too, consistent with "no revocation on deletion". Confirm, or revoke
   only on purge.
4. **Replies in one's own topic** earn +1 like any reply (proposed yes).

🪙 Points reward contributions; the ledger remembers why.
