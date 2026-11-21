/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Read Integration
 * 📄 File: apps/api/src/composition/content-reads/infrastructure/forum-news-facts.adapter.ts
 *
 * 🎯 Purpose:
 * Supplies Forum with News-owned author and publication facts.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import type { ForumNewsFacts, ForumNewsFactsReader } from '@api/modules/forum';
import {
  NEWS_DISCUSSION_FACTS,
  type NewsDiscussionFactsReader,
} from '@api/modules/news';

@Injectable()
export class ForumNewsFactsAdapter implements ForumNewsFactsReader {
  constructor(
    @Inject(NEWS_DISCUSSION_FACTS)
    private readonly news: NewsDiscussionFactsReader,
  ) {}

  async find(articleId: string, at: Date): Promise<ForumNewsFacts | null> {
    const facts = await this.news.find(articleId, at);
    return facts
      ? { authorId: facts.authorId, published: facts.published }
      : null;
  }
}
