/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/infrastructure/prisma-forum-search.ts
 *
 * 🎯 Purpose:
 * Viewer-safe forum search over topic titles and visible, ungated posts.
 *
 * ⚠️ Important:
 * Category visibility is decided before the query (same rules as browsing);
 * trashed and merged topics and hidden/deleted/purged posts never match.
 * Matching uses ILIKE; a trigram index is a follow-up once volumes justify it.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService, type TransactionClient } from '@api/core/database';
import type {
  ForumSearchHit,
  ForumSearchSource,
} from '../contracts/forum-search-source.contract';
import {
  FORUM_VIEWER_FACTS,
  type ForumViewerFactsReader,
} from '../contracts/forum-viewer-facts.contract';
import { canSeeCategory } from '../domain/forum-structure.rules';
import type { ForumViewerFacts } from '../domain/types/forum-structure.type';

const GATE_MARKER = '%"contentGate"%';
const EXCERPT_LENGTH = 200;

type HitRow = {
  id: string;
  title: string;
  createdAt: Date;
  excerpt: string | null;
};

function likePattern(term: string): string {
  return '%' + term.replace(/[\\%_]/g, (c) => '\\' + c) + '%';
}

@Injectable()
export class PrismaForumSearch implements ForumSearchSource {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(FORUM_VIEWER_FACTS)
    private readonly viewers: ForumViewerFactsReader,
  ) {}

  async search(query: {
    term: string;
    page: number;
    pageSize: number;
    viewerId?: string;
  }) {
    const viewer = await this.viewers.read(query.viewerId ?? null, new Date());
    // Category policy, results, total and facets come from ONE snapshot, so a
    // visibility change between statements can never mix two states.
    return this.prisma.$transaction(
      (tx) => this.searchInSnapshot(tx, viewer, query),
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  private async searchInSnapshot(
    tx: TransactionClient,
    viewer: ForumViewerFacts,
    query: { term: string; page: number; pageSize: number },
  ) {
    const categories = await tx.forumCategory.findMany({
      where: viewer.seesAllCategories ? {} : { active: true },
      select: {
        id: true,
        visibility: true,
        audience: { select: { subjectKey: true } },
      },
    });
    const visible = categories
      .filter((category) =>
        canSeeCategory(
          {
            visibility: category.visibility,
            audienceKeys: category.audience.map(({ subjectKey }) => subjectKey),
          },
          viewer,
        ),
      )
      .map(({ id }) => id);
    if (visible.length === 0) return { items: [], total: 0, categories: [] };

    const term = query.term.trim();
    const pattern = likePattern(term);
    const inactiveAllowed = viewer.seesAllCategories;
    const where = Prisma.sql`
      c."id" IN (${Prisma.join(visible)})
      AND t."mergedIntoTopicId" IS NULL
      AND t."state"::text IN ('OPEN', 'CLOSED', 'ARCHIVED')
      AND (${inactiveAllowed} OR (f."active" AND c."active" AND COALESCE(pf."active", TRUE)))
      AND (
        t."title" ILIKE ${pattern}
        OR EXISTS (
          SELECT 1 FROM "forum_posts" p
          WHERE p."topicId" = t."id" AND p."state" = 'VISIBLE'
            AND p."searchText" ILIKE ${pattern}
            AND p."document"::text NOT LIKE ${GATE_MARKER}
        )
      )`;
    const from = Prisma.sql`
      FROM "forum_topics" t
      JOIN "forums" f ON f."id" = t."forumId"
      LEFT JOIN "forums" pf ON pf."id" = f."parentId"
      JOIN "forum_categories" c ON c."id" = f."categoryId"`;
    const offset = (query.page - 1) * query.pageSize;
    // Sequential on purpose: statements of one transaction share its snapshot.
    const rows = await tx.$queryRaw<HitRow[]>`
        SELECT t."id", t."title", t."createdAt", ex."plainText" AS "excerpt"
        ${from}
        LEFT JOIN LATERAL (
          SELECT p."plainText" FROM "forum_posts" p
          WHERE p."topicId" = t."id" AND p."state" = 'VISIBLE'
            AND p."document"::text NOT LIKE ${GATE_MARKER}
            AND (p."searchText" ILIKE ${pattern} OR p."number" = 1)
          ORDER BY (p."searchText" ILIKE ${pattern}) DESC, p."number" ASC
          LIMIT 1
        ) ex ON TRUE
        WHERE ${where}
        ORDER BY t."lastPostAt" DESC, t."id" DESC
        LIMIT ${query.pageSize} OFFSET ${offset}`;
    const totals = await tx.$queryRaw<Array<{ total: bigint }>>`
        SELECT COUNT(*)::bigint AS "total" ${from} WHERE ${where}`;
    const byCategory = await tx.$queryRaw<
      Array<{ slug: string; total: bigint }>
    >`
        SELECT c."slug", COUNT(*)::bigint AS "total" ${from}
        WHERE ${where} GROUP BY c."slug" ORDER BY c."slug"`;
    const items: ForumSearchHit[] = rows.map((row) => ({
      id: row.id,
      kind: 'topic',
      language: 'und',
      slug: row.id,
      title: row.title,
      excerpt: this.excerpt(row.excerpt ?? '', term),
      publishedAt: row.createdAt,
    }));
    return {
      items,
      total: Number(totals[0]?.total ?? 0),
      categories: byCategory.map((row) => ({
        slug: row.slug,
        total: Number(row.total),
      })),
    };
  }

  private excerpt(text: string, term: string): string {
    const index = text.toLowerCase().indexOf(term.toLowerCase());
    const start = Math.max(0, index - 60);
    return text.slice(start, start + EXCERPT_LENGTH).trim();
  }
}
