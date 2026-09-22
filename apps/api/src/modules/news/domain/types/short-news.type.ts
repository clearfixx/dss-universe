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
  pin: {
    scope: 'GLOBAL' | 'CATEGORY';
    categoryId: string | null;
    expiresAt: Date | null;
  } | null;
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
    viewerReaction: 'UPVOTE' | 'DOWNVOTE' | null;
  };
};

export type ShortNewsPage = {
  items: ShortNewsItem[];
  pinnedItems: ShortNewsItem[];
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
  pinnedItems: ShortNewsItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type ShortNewsConnection = ShortNewsPage & {
  endCursor: string | null;
};

export type NewsRatingVote = {
  id: string;
  kind: 'UPVOTE' | 'DOWNVOTE';
  updatedAt: Date;
  actor: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
};

export type FullNewsItem = ShortNewsItem & {
  documentJson: string;
  templateDataJson: string;
  allowComments: boolean;
  allowRating: boolean;
  allowSharing: boolean;
  allowIndexing: boolean;
  sharing: {
    total: number;
    channels: Array<{
      channel:
        | 'FACEBOOK'
        | 'X'
        | 'THREADS'
        | 'INSTAGRAM'
        | 'PINTEREST'
        | 'COPY_LINK'
        | 'PRINT';
      count: number;
    }>;
  };
  attachments: NewsAttachment[];
  related: Array<{
    id: string;
    type: 'RELATED' | 'CONTEXTUAL' | 'SERIES';
    anchorText: string;
    language: string;
    slug: string;
    title: string;
    shortText: string;
    coverMediaId: string | null;
    displayPublishedAt: Date;
  }>;
};

export type NewsAttachment = {
  id: string;
  mediaId: string;
  label: string;
  filename: string;
  mimeType: string;
  extension: string;
  size: number;
  kind: string;
  checksumSha256: string;
  checksumSha1: string | null;
  checksumMd5: string | null;
  downloadUrl: string;
};
