import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import {
  NEWS_DELIVERY_REPOSITORY,
  type NewsDeliveryRepository,
} from '../../domain/repositories/news-delivery.repository.interface';
import {
  NEWS_POST_TYPES,
  type NewsPostType,
} from '../../domain/types/news-article.type';
import type {
  FullNewsItem,
  NewsRatingVote,
  ShortNewsConnection,
  ShortNewsItem,
  ShortNewsNumberedPage,
} from '../../domain/types/short-news.type';
import type { NewsChronologicalNavigation } from '../../domain/types/news-links.type';

export type BrowseShortNewsInput = {
  first?: number;
  after?: string;
  language?: string;
  postType?: NewsPostType;
  categorySlug?: string;
  tagSlug?: string;
  search?: string;
  featured?: boolean;
  homepage?: boolean;
};

export type BrowseNumberedNewsInput = Omit<
  BrowseShortNewsInput,
  'first' | 'after'
> & {
  page?: number;
  pageSize?: number;
};

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;
const LANGUAGE_PATTERN = /^[a-z]{2}(?:-[A-Z]{2})?$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

@Injectable()
export class NewsDeliveryService {
  constructor(
    @Inject(NEWS_DELIVERY_REPOSITORY)
    private readonly delivery: NewsDeliveryRepository,
  ) {}

  async browseShort(
    input: BrowseShortNewsInput = {},
    viewerId?: string,
  ): Promise<ShortNewsConnection> {
    const first = Math.min(
      Math.max(Math.trunc(input.first ?? DEFAULT_PAGE_SIZE), 1),
      MAX_PAGE_SIZE,
    );
    const filters = this.filters(input);
    const page = await this.delivery.browseShort({
      ...filters,
      first,
      ...(input.after ? { cursor: this.decodeCursor(input.after) } : {}),
      ...(viewerId ? { viewerId } : {}),
    });
    const last = page.items.at(-1);
    return {
      ...page,
      endCursor: last ? this.encodeCursor(last) : null,
    };
  }

  async browseNumbered(
    input: BrowseNumberedNewsInput = {},
    viewerId?: string,
  ): Promise<ShortNewsNumberedPage> {
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? DEFAULT_PAGE_SIZE;
    if (!Number.isInteger(page) || page < 1) {
      throw new BadRequestException('News page must be a positive integer.');
    }
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      throw new BadRequestException(
        'News page size must be an integer between 1 and 100.',
      );
    }
    return this.delivery.browseShortNumbered({
      ...this.filters(input),
      page,
      pageSize,
      ...(viewerId ? { viewerId } : {}),
    });
  }

  navigation(articleId: string): Promise<NewsChronologicalNavigation> {
    return this.delivery.chronologicalNavigation(articleId);
  }

  fullBySlug(
    language: string,
    slug: string,
    viewerId?: string,
  ): Promise<FullNewsItem | null> {
    const normalizedLanguage = language.trim();
    const normalizedSlug = this.slug(slug, 'article');
    if (!LANGUAGE_PATTERN.test(normalizedLanguage) || !normalizedSlug) {
      throw new BadRequestException('News address is invalid.');
    }
    return this.delivery.findFullBySlug(
      normalizedLanguage,
      normalizedSlug,
      viewerId,
    );
  }

  ratingVotes(
    articleId: string,
    page = 1,
    pageSize = 20,
  ): Promise<{
    items: NewsRatingVote[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    if (!articleId.trim()) {
      throw new BadRequestException('News article is required.');
    }
    if (!Number.isInteger(page) || page < 1) {
      throw new BadRequestException('Rating page must be a positive integer.');
    }
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      throw new BadRequestException(
        'Rating page size must be between 1 and 100.',
      );
    }
    return this.delivery.ratingVotes(articleId, page, pageSize);
  }

  private slug(value: string | undefined, label: string): string | undefined {
    if (!value) return undefined;
    const slug = value.trim().toLowerCase();
    if (!SLUG_PATTERN.test(slug)) {
      throw new BadRequestException(`News ${label} slug is invalid.`);
    }
    return slug;
  }

  private filters(input: BrowseNumberedNewsInput) {
    const language = input.language?.trim();
    if (language && !LANGUAGE_PATTERN.test(language)) {
      throw new BadRequestException('News language has an invalid format.');
    }
    if (input.postType && !NEWS_POST_TYPES.includes(input.postType)) {
      throw new BadRequestException('News post type is invalid.');
    }
    const categorySlug = this.slug(input.categorySlug, 'category');
    const tagSlug = this.slug(input.tagSlug, 'tag');
    const search = input.search?.trim() || undefined;
    if (search && search.length > 100) {
      throw new BadRequestException(
        'News search is limited to 100 characters.',
      );
    }
    return {
      ...(language ? { language } : {}),
      ...(input.postType ? { postType: input.postType } : {}),
      ...(categorySlug ? { categorySlug } : {}),
      ...(tagSlug ? { tagSlug } : {}),
      ...(search ? { search } : {}),
      ...(input.featured === undefined ? {} : { featured: input.featured }),
      ...(input.homepage === undefined ? {} : { homepage: input.homepage }),
    };
  }

  private encodeCursor(item: ShortNewsItem): string {
    return Buffer.from(
      JSON.stringify({
        publishedAt: item.publishedAt.toISOString(),
        id: item.id,
      }),
      'utf8',
    ).toString('base64url');
  }

  private decodeCursor(value: string): { publishedAt: Date; id: string } {
    try {
      const decoded = JSON.parse(
        Buffer.from(value, 'base64url').toString('utf8'),
      ) as unknown;
      if (
        typeof decoded !== 'object' ||
        decoded === null ||
        !('publishedAt' in decoded) ||
        !('id' in decoded) ||
        typeof decoded.publishedAt !== 'string' ||
        typeof decoded.id !== 'string' ||
        !decoded.id
      ) {
        throw new Error('Invalid cursor shape.');
      }
      const publishedAt = new Date(decoded.publishedAt);
      if (Number.isNaN(publishedAt.getTime())) {
        throw new Error('Invalid cursor date.');
      }
      return { publishedAt, id: decoded.id };
    } catch {
      throw new BadRequestException('Invalid Short News cursor.');
    }
  }
}
