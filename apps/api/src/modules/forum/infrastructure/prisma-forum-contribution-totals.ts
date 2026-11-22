/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/infrastructure/prisma-forum-contribution-totals.ts
 *
 * 🎯 Purpose:
 * Prisma implementation of FORUM_CONTRIBUTION_TOTALS.
 *
 * ⚠️ Important:
 * Three counts per call; public, active sections only.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@api/core/database';
import type {
  ForumContributionTotals,
  ForumContributionTotalsReader,
} from '../contracts/forum-contribution-totals.contract';

const PUBLIC_LIVE_TOPIC: Prisma.ForumTopicWhereInput = {
  mergedIntoTopicId: null,
  state: { in: ['OPEN', 'CLOSED', 'ARCHIVED'] },
  forum: { active: true, category: { active: true, visibility: 'PUBLIC' } },
};

@Injectable()
export class PrismaForumContributionTotals implements ForumContributionTotalsReader {
  constructor(private readonly prisma: PrismaService) {}

  async totalsBetween(
    subjectId: string,
    since: Date,
    until: Date,
  ): Promise<ForumContributionTotals> {
    const window = { gte: since, lt: until };
    const [topics, replies, acceptedAnswers] = await Promise.all([
      this.prisma.forumTopic.count({
        where: { ...PUBLIC_LIVE_TOPIC, authorId: subjectId, createdAt: window },
      }),
      this.prisma.forumPost.count({
        where: {
          authorId: subjectId,
          state: 'VISIBLE',
          number: { gt: 1 },
          createdAt: window,
          topic: PUBLIC_LIVE_TOPIC,
        },
      }),
      this.prisma.forumTopic.count({
        where: {
          ...PUBLIC_LIVE_TOPIC,
          acceptedAt: window,
          acceptedAnswer: { authorId: subjectId, state: 'VISIBLE' },
        },
      }),
    ]);
    return { topics, replies, acceptedAnswers };
  }
}
