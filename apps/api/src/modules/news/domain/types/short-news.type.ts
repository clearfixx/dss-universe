import type { NewsPostType, NewsVisibility } from './news-article.type';

export type ShortNewsCursor = { publishedAt: Date; id: string };

export type ShortNewsQuery = {
  first: number;
  cursor?: ShortNewsCursor;
  viewerId?: string;
  language?: string;
  postType?: NewsPostType;
  categorySlug?: string;
  tagSlug?: string;
  search?: string;
  featured?: boolean;
  homepage?: boolean;
};

export type ShortNewsItem = {
  id: string;
  interactionTargetId: string;
  postType: NewsPostType;
  visibility: NewsVisibility;
  language: string;
  slug: string;
  title: string;
  shortText: string;
  coverMediaId: string | null;
  publishedAt: Date;
  displayPublishedAt: Date;
  featured: boolean;
  author: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    avatarMediaId: string | null;
  };
  primaryCategory: {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
  } | null;
  tags: Array<{ id: string; name: string; slug: string }>;
  engagement: {
    viewCount: number | null;
    commentCount: number;
    upvotes: number;
    downvotes: number;
    score: number;
    bookmarkedByViewer: boolean;
  };
};

export type ShortNewsPage = {
  items: ShortNewsItem[];
  hasNextPage: boolean;
};

export type ShortNewsNumberedQuery = Omit<
  ShortNewsQuery,
  'first' | 'cursor'
> & {
  page: number;
  pageSize: number;
};

export type ShortNewsNumberedPage = {
  items: ShortNewsItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ShortNewsConnection = ShortNewsPage & {
  endCursor: string | null;
};
