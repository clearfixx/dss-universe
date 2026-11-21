/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News
 * 📄 File: apps/api/src/modules/news/infrastructure/discussion/prisma-news-discussion-facts.reader.ts
 *
 * 🎯 Purpose:
 * Reads News-owned author and publication facts for discussion linking.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@api/core/database';
import type {
  NewsDiscussionFacts,
  NewsDiscussionFactsReader,
} from '../../contracts/news-discussion-facts.contract';

@Injectable()
export class PrismaNewsDiscussionFactsReader implements NewsDiscussionFactsReader {
  constructor(private readonly prisma: PrismaService) {}

  async find(articleId: string, at: Date): Promise<NewsDiscussionFacts | null> {
    const article = await this.prisma.newsArticle.findUnique({
      where: { id: articleId },
      select: { id: true, authorId: true, status: true, publishedAt: true },
    });
    if (!article) return null;
    return {
      articleId: article.id,
      authorId: article.authorId,
      published:
        article.status === 'PUBLISHED' &&
        article.publishedAt !== null &&
        article.publishedAt <= at,
    };
  }
}
