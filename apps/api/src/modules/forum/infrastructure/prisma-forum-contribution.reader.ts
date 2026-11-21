/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/infrastructure/prisma-forum-contribution.reader.ts
 *
 * 🎯 Purpose:
 * Owned evidence for Forum Community Points: who authored a topic or post and
 * who first accepted a post as an answer.
 *
 * ⚠️ Important:
 * Reads inside the caller's admission transaction; never projects content.
 * Topics and posts are never deleted, so evidence survives tombstones and
 * purge (owner decision: forum points are never revoked).
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import type { TransactionClient } from '@api/core/database';

@Injectable()
export class PrismaForumContributionReader {
  async topic(transaction: TransactionClient, topicId: string) {
    const row = await transaction.forumTopic.findUnique({
      where: { id: topicId },
      select: { id: true, authorId: true },
    });
    return row ? { ...row, qualificationRevision: '1' as const } : null;
  }

  async post(transaction: TransactionClient, postId: string) {
    const row = await transaction.forumPost.findUnique({
      where: { id: postId },
      select: {
        id: true,
        authorId: true,
        number: true,
        firstAcceptedById: true,
      },
    });
    return row ? { ...row, qualificationRevision: '1' as const } : null;
  }
}
