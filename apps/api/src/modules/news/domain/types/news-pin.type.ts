export const NEWS_PIN_SCOPES = ['GLOBAL', 'CATEGORY'] as const;
export type NewsPinScope = (typeof NEWS_PIN_SCOPES)[number];

export type NewsPin = {
  id: string;
  articleId: string;
  scope: NewsPinScope;
  categoryId: string | null;
  expiresAt: Date | null;
  pinnedById: string;
  createdAt: Date;
  updatedAt: Date;
};

export type SetNewsPin = {
  articleId: string;
  actorId: string;
  scope: NewsPinScope;
  categoryId: string | null;
  expiresAt: Date | null;
};
