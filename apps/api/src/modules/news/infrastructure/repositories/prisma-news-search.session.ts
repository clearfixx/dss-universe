/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News
 * 📄 File: apps/api/src/modules/news/infrastructure/repositories/prisma-news-search.session.ts
 *
 * 🎯 Purpose:
 * Selects complete viewer-safe News search pages within one persistence snapshot.
 *
 * 🧠 Responsibilities:
 * • rejects missing/incompatible public evidence instead of using authored text;
 * • batches gated candidates through the News-owned projection port;
 * • selects pins, totals and pages from a transaction-local matching relation.
 *
 * 🏗️ Architecture:
 * Guarded News infrastructure. Root composition supplies the shared read snapshot;
 * Editor/ContentAccess decisions arrive only through the semantic News port.
 *
 * ⚠️ Important:
 * Batch/concurrency bounds are not result caps. No viewer decision survives this request.
 * The transaction retains default timeouts: exhaustion fails, never truncates results.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@api/core/database';
import { NEWS_SEARCH_PROJECTION_VERSION } from '../../domain/constants/news-search-projection.constant';
import {
  NEWS_SEARCH_BATCH_PROJECTOR,
  type NewsSearchBatchProjector,
} from '../../domain/ports/news-search-batch-projector.interface';
import type {
  ShortNewsNumberedQuery,
  ShortNewsQuery,
} from '../../domain/types/short-news.type';
import {
  newsSearchEligibility,
  newsSearchMetadataMatch,
} from './news-search-eligibility.sql';

type SearchInput = ShortNewsQuery | ShortNewsNumberedQuery;
type SearchSelection = {
  itemIds: string[];
  pinnedIds: string[];
  total: number;
  hasNextPage: boolean;
};
const BATCH_SIZE = 64;

@Injectable()
export class PrismaNewsSearchSession {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(NEWS_SEARCH_BATCH_PROJECTOR)
    private readonly projector: NewsSearchBatchProjector,
  ) {}

  run<T>(
    input: SearchInput,
    read: (
      transaction: Prisma.TransactionClient,
      selection: SearchSelection,
    ) => Promise<T>,
  ): Promise<T> {
    const search = input.search;
    if (!search) throw new Error('News search requires a search expression.');
    return this.prisma.$transaction(
      async (transaction) =>
        read(transaction, await this.select(transaction, input)),
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async select(
    transaction: Prisma.TransactionClient,
    input: SearchInput,
  ): Promise<SearchSelection> {
    const search = input.search;
    if (!search) throw new Error('News search requires a search expression.');
    const now = new Date();
    const eligible = newsSearchEligibility(input);
    const metadataMatch = newsSearchMetadataMatch(search);
    const gaps = await transaction.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT a."id" FROM "news_articles" a
        LEFT JOIN "news_search_projections" p ON p."articleId" = a."id"
        WHERE ${eligible} AND (p."articleId" IS NULL
          OR p."sourceVersion" <> a."currentVersion"
          OR p."projectionVersion" <> ${NEWS_SEARCH_PROJECTION_VERSION}) LIMIT 1
      `);
    if (gaps.length) throw new Error('News search index requires maintenance.');
    await transaction.$executeRaw(Prisma.sql`
        CREATE TEMP TABLE "dss_news_search_matches" (
          "id" text PRIMARY KEY, "publishedAt" timestamp(3) NOT NULL
        ) ON COMMIT DROP
      `);
    await transaction.$executeRaw(Prisma.sql`
        INSERT INTO pg_temp."dss_news_search_matches" ("id", "publishedAt")
        SELECT a."id", a."publishedAt" FROM "news_articles" a
        JOIN "news_search_projections" p ON p."articleId" = a."id"
        WHERE ${eligible} AND (${metadataMatch} OR (
          ${input.viewerId ? Prisma.sql`NOT p."hasContentGates"` : Prisma.sql`TRUE`}
          AND p."publicSearchText" ILIKE ('%' || ${search} || '%')))
      `);
    if (input.viewerId) {
      await this.matchGated(
        transaction,
        eligible,
        metadataMatch,
        search,
        input.viewerId,
      );
    }
    const pins = await transaction.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT m."id" FROM pg_temp."dss_news_search_matches" m
        JOIN "news_pins" pin ON pin."articleId" = m."id"
        WHERE (pin."expiresAt" IS NULL OR pin."expiresAt" > ${now})
          AND (pin."scope" = 'GLOBAL' ${
            input.categorySlug
              ? Prisma.sql`OR (
            pin."scope" = 'CATEGORY' AND EXISTS (
              SELECT 1 FROM "news_categories" c WHERE c."id" = pin."categoryId"
                AND c."slug" = ${input.categorySlug} AND c."isActive"
            ))`
              : Prisma.empty
          })
        ORDER BY m."publishedAt" DESC, m."id" DESC LIMIT 20
      `);
    const pinnedIds = pins.map(({ id }) => id);
    const unpinned = pinnedIds.length
      ? Prisma.sql`m."id" NOT IN (${Prisma.join(pinnedIds)})`
      : Prisma.sql`TRUE`;
    const [count] = await transaction.$queryRaw<{ total: number }[]>(Prisma.sql`
        SELECT COUNT(*)::integer AS "total" FROM pg_temp."dss_news_search_matches" m WHERE ${unpinned}
      `);
    const numbered = 'page' in input;
    const size = numbered ? input.pageSize : input.first;
    const cursor = !numbered ? input.cursor : undefined;
    const rows = await transaction.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT m."id" FROM pg_temp."dss_news_search_matches" m WHERE ${unpinned}
        ${
          cursor
            ? Prisma.sql`AND (m."publishedAt" < ${cursor.publishedAt} OR (
          m."publishedAt" = ${cursor.publishedAt} AND m."id" < ${cursor.id}))`
            : Prisma.empty
        }
        ORDER BY m."publishedAt" DESC, m."id" DESC
        LIMIT ${numbered ? size : size + 1} OFFSET ${numbered ? (input.page - 1) * size : 0}
      `);
    return {
      itemIds: rows.slice(0, size).map(({ id }) => id),
      pinnedIds,
      total: count.total,
      hasNextPage: !numbered && rows.length > size,
    };
  }

  private async matchGated(
    transaction: Prisma.TransactionClient,
    eligible: Prisma.Sql,
    metadataMatch: Prisma.Sql,
    search: string,
    viewerId: string,
  ): Promise<void> {
    let afterId: string | null = null;
    for (;;) {
      const batch: { id: string; documentJson: string }[] =
        await transaction.$queryRaw<
          { id: string; documentJson: string }[]
        >(Prisma.sql`
        SELECT a."id", a."document"::text AS "documentJson" FROM "news_articles" a
        JOIN "news_search_projections" p ON p."articleId" = a."id"
        WHERE ${eligible} AND p."hasContentGates" AND NOT ${metadataMatch}
          AND (${afterId}::text IS NULL OR a."id" > ${afterId})
        ORDER BY a."id" ASC LIMIT ${BATCH_SIZE}
      `);
      if (!batch.length) return;
      let projected: Awaited<ReturnType<NewsSearchBatchProjector['project']>>;
      try {
        projected = await this.projector.project(
          batch.map(({ documentJson }) => documentJson),
          viewerId,
        );
        if (projected.length !== batch.length)
          throw new Error('Incomplete batch.');
      } catch {
        throw new Error('News search projection is unavailable.');
      }
      const evidence = batch.map(
        (source, index) =>
          Prisma.sql`(${source.id}::text, ${projected[index].searchText}::text)`,
      );
      await transaction.$executeRaw(Prisma.sql`
        INSERT INTO pg_temp."dss_news_search_matches" ("id", "publishedAt")
        SELECT a."id", a."publishedAt" FROM (VALUES ${Prisma.join(evidence)}) AS v("id", "text")
        JOIN "news_articles" a ON a."id" = v."id"
        WHERE v."text" ILIKE ('%' || ${search} || '%')
      `);
      afterId = batch.at(-1)!.id;
    }
  }
}
