/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News
 * 📄 File: apps/api/src/modules/news/infrastructure/repositories/prisma-news-search-projection.repository.ts
 *
 * 🎯 Purpose:
 * Maintains News-owned public search evidence against locked source snapshots.
 *
 * 🧠 Responsibilities:
 * • scans missing/incompatible projections using bounded keyset reads;
 * • compares both version and full JSONB source under a row lock before installation;
 * • counts all remaining source gaps, including rows changed behind the scan cursor.
 *
 * 🏗️ Architecture:
 * Private News persistence; no Editor parser, viewer policy or foreign table access.
 *
 * ⚠️ Important:
 * Source locks and upserts share one transaction. Missing/stale evidence is not empty content.
 * Raw SQL parameters contain private source data and must never become operational output.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@api/core/database';
import type { NewsSearchProjectionRepository } from '../../domain/repositories/news-search-projection.repository.interface';
import type {
  NewsSearchProjectionWrite,
  NewsSearchSource,
} from '../../domain/types/news-search-projection.type';

@Injectable()
export class PrismaNewsSearchProjectionRepository implements NewsSearchProjectionRepository {
  constructor(private readonly prisma: PrismaService) {}

  scanMissing(
    projectionVersion: number,
    afterId: string | null,
    take: number,
  ): Promise<NewsSearchSource[]> {
    return this.prisma.$queryRaw<NewsSearchSource[]>(Prisma.sql`
      SELECT a."id" AS "articleId", a."currentVersion" AS "sourceVersion",
             a."document"::text AS "documentJson"
      FROM "news_articles" a
      LEFT JOIN "news_search_projections" p ON p."articleId" = a."id"
      WHERE (p."articleId" IS NULL OR p."sourceVersion" <> a."currentVersion"
             OR p."projectionVersion" <> ${projectionVersion})
        AND (${afterId}::text IS NULL OR a."id" > ${afterId})
      ORDER BY a."id" ASC LIMIT ${take}
    `);
  }

  install(input: NewsSearchProjectionWrite): Promise<boolean> {
    return this.prisma.$transaction(async (transaction) => {
      const sources = await transaction.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT "id" FROM "news_articles"
        WHERE "id" = ${input.articleId} AND "currentVersion" = ${input.sourceVersion}
          AND "document" = ${input.documentJson}::jsonb
        FOR UPDATE
      `);
      if (sources.length !== 1) return false;
      const evidence = {
        sourceVersion: input.sourceVersion,
        projectionVersion: input.projectionVersion,
        publicSearchText: input.publicSearchText,
        hasContentGates: input.hasContentGates,
      };
      await transaction.newsSearchProjection.upsert({
        where: { articleId: input.articleId },
        create: { articleId: input.articleId, ...evidence },
        update: evidence,
      });
      return true;
    });
  }

  async countMissing(projectionVersion: number): Promise<number> {
    const [row] = await this.prisma.$queryRaw<{ count: number }[]>(Prisma.sql`
      SELECT COUNT(*)::integer AS "count" FROM "news_articles" a
      LEFT JOIN "news_search_projections" p ON p."articleId" = a."id"
      WHERE p."articleId" IS NULL OR p."sourceVersion" <> a."currentVersion"
         OR p."projectionVersion" <> ${projectionVersion}
    `);
    return row.count;
  }
}
