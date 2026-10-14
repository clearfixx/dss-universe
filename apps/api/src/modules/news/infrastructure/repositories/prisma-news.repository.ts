/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News
 * 📄 File: apps/api/src/modules/news/infrastructure/repositories/prisma-news.repository.ts
 *
 * 🎯 Purpose:
 * Reads owned News state and delegates cross-owner writes through a semantic transaction port.
 *
 * 🧠 Responsibilities:
 * • reads and maps owned News rows and editorial pages;
 * • delegates atomic cross-owner writes through the News-owned semantic port.
 *
 * 🏗️ Architecture:
 * News persistence adapter; transaction composition lives explicitly at the root.
 *
 * ⚠️ Important:
 * This repository must not receive a foreign target writer or expose its Prisma client.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import { Prisma, type NewsArticle as NewsArticleRow } from '@prisma/client';
import type { EditorDocument } from '@dss/editor';

import { PrismaService } from '@api/core/database';
import {
  NEWS_DRAFT_TRANSACTION,
  type NewsDraftTransaction,
} from '../../domain/ports/news-draft-transaction.interface';
import type { NewsRepository } from '../../domain/repositories/news.repository.interface';
import type {
  CreateNewsDraft,
  NewsArticle,
  NewsEditorialListPage,
  NewsEditorialListQuery,
  SaveNewsDraft,
} from '../../domain/types/news-article.type';

@Injectable()
export class PrismaNewsRepository implements NewsRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(NEWS_DRAFT_TRANSACTION)
    private readonly writes: NewsDraftTransaction,
  ) {}

  createDraft(input: CreateNewsDraft): Promise<NewsArticle> {
    return this.writes.createDraft(input);
  }

  async findById(id: string): Promise<NewsArticle | null> {
    const article = await this.prisma.newsArticle.findUnique({ where: { id } });
    return article ? this.toDomain(article) : null;
  }

  async findBySlug(
    language: string,
    slug: string,
  ): Promise<NewsArticle | null> {
    const article = await this.prisma.newsArticle.findUnique({
      where: { language_slug: { language, slug } },
    });
    return article ? this.toDomain(article) : null;
  }

  async listEditorial(
    input: NewsEditorialListQuery,
  ): Promise<NewsEditorialListPage> {
    const where: Prisma.NewsArticleWhereInput = {
      ...(input.includeAll ? {} : { authorId: input.actorId }),
      ...(input.statuses?.length ? { status: { in: input.statuses } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.newsArticle.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
      this.prisma.newsArticle.count({ where }),
    ]);
    return {
      items: rows.map((row) => this.toDomain(row)),
      total,
      page: input.page,
      pageSize: input.pageSize,
      totalPages: Math.ceil(total / input.pageSize),
    };
  }

  saveDraft(input: SaveNewsDraft): Promise<NewsArticle | null> {
    return this.writes.saveDraft(input);
  }

  private toDomain(article: NewsArticleRow): NewsArticle {
    return {
      ...article,
      document: article.document as unknown as EditorDocument,
    };
  }
}
