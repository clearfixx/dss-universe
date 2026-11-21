/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/infrastructure/prisma-forum-read-models.ts
 *
 * 🎯 Purpose:
 * Batch read models the forum UI needs next to the main queries: the
 * viewer's own vote per post and per-forum counters with the last activity.
 *
 * ⚠️ Important:
 * Called with IDs that the main query already authorized. Counters include
 * open, closed and archived topics; trashed and merged topics never count.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@api/core/database';

export type ForumActivityStats = Readonly<{
  topicCount: number;
  postCount: number;
  lastTopic: Readonly<{
    id: string;
    title: string;
    lastPostAt: Date;
    lastPostNumber: number;
    lastPostAuthorId: string;
  }> | null;
}>;

const EMPTY: ForumActivityStats = {
  topicCount: 0,
  postCount: 0,
  lastTopic: null,
};

@Injectable()
export class PrismaForumReadModels {
  constructor(private readonly prisma: PrismaService) {}

  /** Active (not reversed) vote value of the viewer per post. */
  async viewerVotes(
    viewerId: string,
    postIds: readonly string[],
  ): Promise<Map<string, number>> {
    if (postIds.length === 0) return new Map();
    const rows = await this.prisma.forumPostVote.findMany({
      where: {
        voterId: viewerId,
        postId: { in: [...postIds] },
        reversedAt: null,
      },
      select: { postId: true, value: true },
    });
    return new Map(rows.map((row) => [row.postId, row.value]));
  }

  async forumStats(
    forumIds: readonly string[],
  ): Promise<Map<string, ForumActivityStats>> {
    if (forumIds.length === 0) return new Map();
    const ids = [...forumIds];
    const visibleStates = Prisma.sql`t."state"::text IN ('OPEN', 'CLOSED', 'ARCHIVED') AND t."mergedIntoTopicId" IS NULL`;
    const [totals, latest] = await Promise.all([
      this.prisma.$queryRaw<
        Array<{ forumId: string; topics: bigint; posts: bigint }>
      >`
        SELECT t."forumId", COUNT(*)::bigint AS "topics", COALESCE(SUM(t."postCount"), 0)::bigint AS "posts"
        FROM "forum_topics" t
        WHERE t."forumId" IN (${Prisma.join(ids)}) AND ${visibleStates}
        GROUP BY t."forumId"`,
      this.prisma.$queryRaw<
        Array<{
          forumId: string;
          id: string;
          title: string;
          lastPostAt: Date;
          lastPostNumber: number;
          lastPostAuthorId: string;
        }>
      >`
        SELECT DISTINCT ON (t."forumId") t."forumId", t."id", t."title", t."lastPostAt", t."lastPostNumber", t."lastPostAuthorId"
        FROM "forum_topics" t
        WHERE t."forumId" IN (${Prisma.join(ids)}) AND ${visibleStates}
        ORDER BY t."forumId", t."lastPostAt" DESC, t."id" DESC`,
    ]);
    const stats = new Map<string, ForumActivityStats>(
      ids.map((id) => [id, EMPTY]),
    );
    for (const row of totals) {
      stats.set(row.forumId, {
        ...EMPTY,
        topicCount: Number(row.topics),
        postCount: Number(row.posts),
      });
    }
    for (const row of latest) {
      const current = stats.get(row.forumId) ?? EMPTY;
      stats.set(row.forumId, {
        ...current,
        lastTopic: {
          id: row.id,
          title: row.title,
          lastPostAt: row.lastPostAt,
          lastPostNumber: row.lastPostNumber,
          lastPostAuthorId: row.lastPostAuthorId,
        },
      });
    }
    return stats;
  }
}
