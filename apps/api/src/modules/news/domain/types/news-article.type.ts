/** Canonical Phase 10 News domain types, independent from Prisma. */
import type { EditorDocument } from '@dss/editor';

export const NEWS_ARTICLE_STATUSES = [
  'DRAFT',
  'IN_REVIEW',
  'CHANGES_REQUESTED',
  'APPROVED',
  'SCHEDULED',
  'PUBLISHED',
  'ARCHIVED',
] as const;
export type NewsArticleStatus = (typeof NEWS_ARTICLE_STATUSES)[number];

export const NEWS_POST_TYPES = [
  'STANDARD',
  'TEXT',
  'GALLERY',
  'VIDEO',
  'AUDIO',
] as const;
export type NewsPostType = (typeof NEWS_POST_TYPES)[number];
export type NewsVisibility = 'PUBLIC' | 'MEMBERS';

export type NewsArticle = {
  id: string;
  interactionTargetId: string;
  authorId: string;
  postType: NewsPostType;
  status: NewsArticleStatus;
  visibility: NewsVisibility;
  language: string;
  slug: string;
  title: string;
  shortText: string;
  document: EditorDocument;
  plainText: string;
  searchText: string;
  coverMediaId: string | null;
  currentVersion: number;
  allowComments: boolean;
  allowRating: boolean;
  allowSharing: boolean;
  allowIndexing: boolean;
  showOnHomepage: boolean;
  featured: boolean;
  submittedAt: Date | null;
  approvedAt: Date | null;
  publishedAt: Date | null;
  displayPublishedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateNewsDraft = {
  authorId: string;
  postType: NewsPostType;
  visibility: NewsVisibility;
  language: string;
  slug: string;
  title: string;
  shortText: string;
  document: EditorDocument;
  plainText: string;
  searchText: string;
  coverMediaId: string | null;
};

export type CreateNewsDraftRequest = Omit<
  CreateNewsDraft,
  'document' | 'plainText' | 'searchText'
> & { documentJson: string };
