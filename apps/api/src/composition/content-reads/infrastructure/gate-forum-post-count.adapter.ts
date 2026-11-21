/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Read Integration
 * 📄 File: apps/api/src/composition/content-reads/infrastructure/gate-forum-post-count.adapter.ts
 *
 * 🎯 Purpose:
 * Supplies Content Access with Forum's public topic count (FORUM_POSTS).
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import type { GateForumPostCountReader } from '@api/modules/content-access';
import { FORUM_TOPIC_COUNTS, type ForumTopicCounts } from '@api/modules/forum';

@Injectable()
export class GateForumPostCountAdapter implements GateForumPostCountReader {
  constructor(
    @Inject(FORUM_TOPIC_COUNTS) private readonly forum: ForumTopicCounts,
  ) {}

  countByAuthor(subjectId: string): Promise<number> {
    return this.forum.countPublicTopicsByAuthor(subjectId);
  }
}
