/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/infrastructure/prisma-forum-topic-counts.ts
 *
 * 🎯 Purpose:
 * Counts a member's topics in public forums for the FORUM_POSTS gate fact.
 *
 * ⚠️ Important:
 * Owner decision: topics only, public forums only; trashed and merged topics
 * do not count.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@api/core/database';
import type { ForumTopicCounts } from '../contracts/forum-topic-counts.contract';

@Injectable()
export class PrismaForumTopicCounts implements ForumTopicCounts {
  constructor(private readonly prisma: PrismaService) {}

  countPublicTopicsByAuthor(subjectId: string): Promise<number> {
    return this.prisma.forumTopic.count({
      where: {
        authorId: subjectId,
        mergedIntoTopicId: null,
        state: { in: ['OPEN', 'CLOSED', 'ARCHIVED'] },
        forum: {
          active: true,
          category: { active: true, visibility: 'PUBLIC' },
        },
      },
    });
  }
}
