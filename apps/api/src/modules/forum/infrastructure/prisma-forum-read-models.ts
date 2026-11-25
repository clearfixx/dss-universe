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
import type { ForumAccessGrant } from '../domain/forum-access.rules';
import type { ForumViewerFacts } from '../domain/types/forum-structure.type';
import { ForumAccessPolicy } from './forum-access.policy';

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

  /**
   * Visible posts per author in live topics (not trashed or merged away).
   * Hidden, deleted and purged posts do not count.
   */
  async memberPostCounts(
    authorIds: readonly string[],
  ): Promise<Map<string, number>> {
    const ids = [...new Set(authorIds)];
    if (ids.length === 0) return new Map();
    const rows = await this.prisma.forumPost.groupBy({
      by: ['authorId'],
      where: {
        authorId: { in: ids },
        state: 'VISIBLE',
        topic: {
          state: { in: ['OPEN', 'CLOSED', 'ARCHIVED'] },
          mergedIntoTopicId: null,
        },
      },
      _count: { _all: true },
    });
    return new Map(rows.map((row) => [row.authorId, row._count._all]));
  }

  async forumStats(
    forumIds: readonly string[],
  ): Promise<Map<string, ForumActivityStats>> {
    if (forumIds.length === 0) return new Map();
    const ids = [...forumIds];
    const visibleStates = Prisma.sql`t."state"::text IN ('OPEN', 'CLOSED', 'ARCHIVED') AND t."mergedIntoTopicId" IS NULL`;
    // Public counters and "last activity" come from VISIBLE posts only, not
    // from the topic's denormalized lastPost* fields: those keep pointing at
    // a post after it is hidden, deleted or purged. One statement, one
    // snapshot, so totals and last activity always agree.
    const rows = await this.prisma.$queryRaw<
      Array<{
        forumId: string;
        topics: bigint;
        posts: bigint;
        topicId: string | null;
        title: string | null;
        lastPostAt: Date | null;
        lastPostNumber: number | null;
        lastPostAuthorId: string | null;
      }>
    >`
      WITH visible_topics AS (
        SELECT t."id", t."forumId", t."title"
        FROM "forum_topics" t
        WHERE t."forumId" IN (${Prisma.join(ids)}) AND ${visibleStates}
      ),
      visible_posts AS (
        SELECT p."topicId", p."number", p."authorId", p."createdAt", vt."forumId", vt."title"
        FROM "forum_posts" p
        JOIN visible_topics vt ON vt."id" = p."topicId"
        WHERE p."state" = 'VISIBLE'
      ),
      totals AS (
        SELECT vt."forumId", COUNT(*)::bigint AS "topics",
          (SELECT COUNT(*) FROM visible_posts vp WHERE vp."forumId" = vt."forumId")::bigint AS "posts"
        FROM visible_topics vt
        GROUP BY vt."forumId"
      ),
      latest AS (
        SELECT DISTINCT ON (vp."forumId") vp."forumId", vp."topicId", vp."title",
          vp."createdAt" AS "lastPostAt", vp."number" AS "lastPostNumber", vp."authorId" AS "lastPostAuthorId"
        FROM visible_posts vp
        ORDER BY vp."forumId", vp."createdAt" DESC, vp."topicId" DESC, vp."number" DESC
      )
      SELECT totals."forumId", totals."topics", totals."posts",
        latest."topicId", latest."title", latest."lastPostAt", latest."lastPostNumber", latest."lastPostAuthorId"
      FROM totals LEFT JOIN latest ON latest."forumId" = totals."forumId"`;
    const totals = rows;
    const latest = rows
      .filter(
        (
          row,
        ): row is typeof row & {
          topicId: string;
          title: string;
          lastPostAt: Date;
          lastPostNumber: number;
          lastPostAuthorId: string;
        } => row.topicId !== null,
      )
      .map((row) => ({ ...row, id: row.topicId }));
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

  /** Category IDs the viewer moderates by an active assignment. */
  /** Whole-category assignments only (forum-level ones are separate). */
  async assignedCategories(viewerId: string): Promise<Set<string>> {
    const rows = await this.prisma.forumModeratorAssignment.findMany({
      where: { moderatorId: viewerId, revokedAt: null, forumId: null },
      select: { categoryId: true },
    });
    return new Set(rows.map(({ categoryId }) => categoryId));
  }

  async assignedForums(viewerId: string): Promise<Set<string>> {
    const rows = await this.prisma.forumModeratorAssignment.findMany({
      where: { moderatorId: viewerId, revokedAt: null, forumId: { not: null } },
      select: { forumId: true },
    });
    return new Set(rows.map(({ forumId }) => forumId!));
  }

  /** Section switches and the viewer's matrix rights, batched. */
  async forumSections(
    viewer: ForumViewerFacts,
    forumIds: readonly string[],
  ): Promise<
    Map<
      string,
      {
        parentId: string | null;
        allowReplies: boolean;
        grant: ForumAccessGrant;
      }
    >
  > {
    if (forumIds.length === 0) return new Map();
    const rows = await this.prisma.forum.findMany({
      where: { id: { in: [...forumIds] } },
      select: {
        id: true,
        parentId: true,
        categoryId: true,
        allowReplies: true,
      },
    });
    const grants = await new ForumAccessPolicy(this.prisma).grants(
      viewer,
      rows,
    );
    return new Map(
      rows.map((row) => [
        row.id,
        {
          parentId: row.parentId,
          allowReplies: row.allowReplies,
          grant: grants.get(row.id)!,
        },
      ]),
    );
  }

  async forumCategories(
    forumIds: readonly string[],
  ): Promise<Map<string, string>> {
    if (forumIds.length === 0) return new Map();
    const rows = await this.prisma.forum.findMany({
      where: { id: { in: [...forumIds] } },
      select: { id: true, categoryId: true },
    });
    return new Map(rows.map((row) => [row.id, row.categoryId]));
  }
}
