/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News
 * 📄 File: apps/api/src/modules/news/domain/ports/news-delivery-reader.interface.ts
 *
 * 🎯 Purpose:
 * Defines News-owned delivery operations implemented by root read composition without ORM contracts.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { NewsChronologicalNavigation } from '../types/news-links.type';
import type { NewsFullRecord } from '../types/news-full-record.type';
import type { NewsCommentsPage } from '../types/news-comment.type';
import type {
  NewsRatingVote,
  ShortNewsNumberedPage,
  ShortNewsNumberedQuery,
  ShortNewsPage,
  ShortNewsQuery,
} from '../types/short-news.type';

export const NEWS_DELIVERY_READER = Symbol('NEWS_DELIVERY_READER');

export interface NewsDeliveryReader {
  browseShort(input: ShortNewsQuery): Promise<ShortNewsPage>;
  browseShortNumbered(
    input: ShortNewsNumberedQuery,
  ): Promise<ShortNewsNumberedPage>;
  chronologicalNavigation(
    articleId: string,
  ): Promise<NewsChronologicalNavigation>;
  findFullBySlug(
    language: string,
    slug: string,
    viewerId?: string,
  ): Promise<NewsFullRecord | null>;
  ratingVotes(
    articleId: string,
    page: number,
    pageSize: number,
    viewerId?: string,
  ): Promise<{
    items: NewsRatingVote[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>;
  comments(
    articleId: string,
    page: number,
    pageSize: number,
    viewerId?: string,
  ): Promise<NewsCommentsPage>;
}
