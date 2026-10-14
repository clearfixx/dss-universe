/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News
 * 📄 File: apps/api/src/modules/news/infrastructure/repositories/news-search-eligibility.sql.ts
 *
 * 🎯 Purpose:
 * Builds parameterized News-owned search eligibility without interpreting viewer policy.
 *
 * 🧠 Responsibilities:
 * • preserves publication, audience and taxonomy filters for the search snapshot;
 * • keeps search comparison identical to existing database substring semantics.
 *
 * 🏗️ Architecture:
 * Private persistence query fragment; all table aliases and identifiers are static.
 *
 * ⚠️ Important:
 * No authored body search or foreign authorization tables belong here.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Prisma } from '@prisma/client';
import type { ShortNewsQuery } from '../../domain/types/short-news.type';

export function newsSearchEligibility(
  input: Omit<ShortNewsQuery, 'first' | 'cursor'>,
): Prisma.Sql {
  return Prisma.sql`
    a."status" = 'PUBLISHED' AND a."publishedAt" IS NOT NULL
    AND a."visibility"::text IN (${Prisma.join(input.viewerId ? ['PUBLIC', 'MEMBERS'] : ['PUBLIC'])})
    ${input.language ? Prisma.sql`AND a."language" = ${input.language}` : Prisma.empty}
    ${input.postType ? Prisma.sql`AND a."postType"::text = ${input.postType}` : Prisma.empty}
    ${input.featured === undefined ? Prisma.empty : Prisma.sql`AND a."featured" = ${input.featured}`}
    ${input.homepage === undefined ? Prisma.empty : Prisma.sql`AND a."showOnHomepage" = ${input.homepage}`}
    ${
      input.categorySlug
        ? Prisma.sql`AND EXISTS (
      SELECT 1 FROM "news_article_categories" ac
      JOIN "news_categories" c ON c."id" = ac."categoryId"
      WHERE ac."articleId" = a."id" AND c."slug" = ${input.categorySlug} AND c."isActive"
    )`
        : Prisma.empty
    }
    ${
      input.tagSlug
        ? Prisma.sql`AND EXISTS (
      SELECT 1 FROM "news_article_tags" atg JOIN "news_tags" t ON t."id" = atg."tagId"
      WHERE atg."articleId" = a."id" AND t."slug" = ${input.tagSlug}
    )`
        : Prisma.empty
    }
  `;
}

export function newsSearchMetadataMatch(search: string): Prisma.Sql {
  return Prisma.sql`(a."title" ILIKE ('%' || ${search} || '%')
    OR a."shortText" ILIKE ('%' || ${search} || '%'))`;
}
