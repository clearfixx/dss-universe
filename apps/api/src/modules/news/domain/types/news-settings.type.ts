export const NEWS_PAGINATION_MODES = [
  'DISABLED',
  'PAGES',
  'LOAD_MORE',
  'BOTH',
] as const;
export type NewsPaginationMode = (typeof NEWS_PAGINATION_MODES)[number];

export type NewsSettings = {
  newsPaginationMode: NewsPaginationMode;
  newsPaginationThreshold: number;
  newsPageSize: number;
  commentsPaginationMode: NewsPaginationMode;
  commentsPaginationThreshold: number;
  commentsPageSize: number;
  updatedAt: Date;
};

export type UpdateNewsSettings = Omit<NewsSettings, 'updatedAt'> & {
  actorId: string;
};
