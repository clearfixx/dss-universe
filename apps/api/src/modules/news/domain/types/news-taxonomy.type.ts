import type { NewsPostType } from './news-article.type';

export const NEWS_FIELD_TYPES = [
  'SHORT_TEXT',
  'LONG_TEXT',
  'NUMBER',
  'BOOLEAN',
  'DATETIME',
  'SELECT',
  'MULTI_SELECT',
  'URL',
  'MEDIA',
  'GALLERY',
  'FILE',
  'MEMBER',
] as const;
export type NewsFieldType = (typeof NEWS_FIELD_TYPES)[number];

export type NewsCategory = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  isActive: boolean;
  allowedPostTypes: NewsPostType[];
  allowComments: boolean;
  allowRating: boolean;
  allowIndexing: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type NewsTag = {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
};

export type NewsFieldDefinition = {
  id: string;
  categoryId: string | null;
  postType: NewsPostType | null;
  key: string;
  label: string;
  type: NewsFieldType;
  required: boolean;
  showInShort: boolean;
  showInFull: boolean;
  includeInSearch: boolean;
  filterable: boolean;
  options: unknown;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateNewsCategory = Omit<
  NewsCategory,
  'id' | 'createdAt' | 'updatedAt'
> & { actorId: string };
export type CreateNewsTag = Pick<NewsTag, 'name' | 'slug'> & {
  actorId: string;
};
export type CreateNewsFieldDefinition = Omit<
  NewsFieldDefinition,
  'id' | 'createdAt' | 'updatedAt'
> & { actorId: string };
