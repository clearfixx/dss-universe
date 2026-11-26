/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Reputation Composition
 * 📄 File: apps/api/src/composition/reputation/infrastructure/reputation-forum-source.adapter.ts
 *
 * 🎯 Purpose:
 * Binds Reputation's REPUTATION_SOURCE_READER to Forum: a forum post is a
 * valid source only if the actor can see it and it is still available;
 * its author is the recipient.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import {
  FORUM_POST_FACTS,
  FORUM_SUBJECT_VISIBILITY,
  type ForumPostFactsReader,
  type ForumSubjectVisibility,
} from '@api/modules/forum';
import {
  reputationSourceKey,
  type ReputationSourceReader,
  type ReputationSourceRef,
  type ReputationSourceStatus,
} from '@api/modules/reputation';

@Injectable()
export class ReputationForumSourceAdapter implements ReputationSourceReader {
  constructor(
    @Inject(FORUM_POST_FACTS) private readonly posts: ForumPostFactsReader,
    @Inject(FORUM_SUBJECT_VISIBILITY)
    private readonly visibility: ForumSubjectVisibility,
  ) {}

  async recipientOf(
    actorId: string,
    source: ReputationSourceRef,
  ): Promise<string | null> {
    if (source.type !== 'FORUM_POST') return null;
    const [facts, visible] = await Promise.all([
      this.posts.facts([source.id]),
      this.visibility.visibleSubjects(actorId, [
        { subjectType: 'ForumPost', subjectId: source.id },
      ]),
    ]);
    const fact = facts.get(source.id);
    if (!fact?.available || !visible.has(`ForumPost:${source.id}`)) {
      return null;
    }
    return fact.authorId;
  }

  async statuses(
    sources: readonly ReputationSourceRef[],
  ): Promise<ReadonlyMap<string, ReputationSourceStatus>> {
    const ids = sources
      .filter((source) => source.type === 'FORUM_POST')
      .map((source) => source.id);
    const facts = await this.posts.facts(ids);
    return new Map(
      sources.map((source) => [
        reputationSourceKey(source),
        facts.get(source.id)?.available ? 'AVAILABLE' : 'DELETED',
      ]),
    );
  }
}
