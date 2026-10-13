/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News
 * 📄 File: apps/api/src/modules/news/domain/ports/news-draft-transaction.interface.ts
 *
 * 🎯 Purpose:
 * Defines atomic News draft writes without sharing transaction clients.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type {
  CreateNewsDraft,
  NewsArticle,
  SaveNewsDraft,
} from '../types/news-article.type';
export interface NewsDraftTransaction {
  createDraft(input: CreateNewsDraft): Promise<NewsArticle>;
  saveDraft(input: SaveNewsDraft): Promise<NewsArticle | null>;
}
export const NEWS_DRAFT_TRANSACTION = Symbol('NEWS_DRAFT_TRANSACTION');
