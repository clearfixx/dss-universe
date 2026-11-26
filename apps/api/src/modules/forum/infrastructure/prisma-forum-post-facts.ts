/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum
 * 📄 File: apps/api/src/modules/forum/infrastructure/prisma-forum-post-facts.ts
 *
 * 🎯 Purpose:
 * Author and availability of forum posts (FORUM_POST_FACTS).
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@api/core/database';
import type {
  ForumPostFact,
  ForumPostFactsReader,
} from '../contracts/forum-post-facts.contract';

const MAX_POSTS = 200;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class PrismaForumPostFacts implements ForumPostFactsReader {
  constructor(private readonly prisma: PrismaService) {}

  async facts(
    postIds: readonly string[],
  ): Promise<ReadonlyMap<string, ForumPostFact>> {
    const ids = [...new Set(postIds)].filter((id) => UUID.test(id));
    if (ids.length === 0) return new Map();
    const rows = await this.prisma.forumPost.findMany({
      where: { id: { in: ids.slice(0, MAX_POSTS) } },
      select: {
        id: true,
        authorId: true,
        state: true,
        topic: { select: { state: true } },
      },
    });
    return new Map(
      rows.map((row) => [
        row.id,
        {
          authorId: row.authorId,
          available: row.state === 'VISIBLE' && row.topic.state !== 'TRASHED',
        },
      ]),
    );
  }
}
