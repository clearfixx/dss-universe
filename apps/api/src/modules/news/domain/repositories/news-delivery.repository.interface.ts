import type { NewsChronologicalNavigation } from '../types/news-links.type';
import type {
  FullNewsItem,
  NewsRatingVote,
  ShortNewsNumberedPage,
  ShortNewsNumberedQuery,
  ShortNewsPage,
  ShortNewsQuery,
} from '../types/short-news.type';

export const NEWS_DELIVERY_REPOSITORY = Symbol('NEWS_DELIVERY_REPOSITORY');

export interface NewsDeliveryRepository {
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
  ): Promise<FullNewsItem | null>;
  ratingVotes(
    articleId: string,
    page: number,
    pageSize: number,
  ): Promise<{
    items: NewsRatingVote[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>;
}
