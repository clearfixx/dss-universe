import type { NewsArticle, NewsArticleStatus } from './news-article.type';

export type NewsEditorialAction =
  | 'SUBMITTED'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'PUBLISHED';

export type NewsEditorialDecision = {
  id: string;
  articleId: string;
  revisionVersion: number;
  actorId: string;
  action: NewsEditorialAction;
  reason: string | null;
  createdAt: Date;
};

export type NewsEditorialTransition = {
  articleId: string;
  actorId: string;
  expectedStatus: NewsArticleStatus;
  expectedVersion: number;
  nextStatus: NewsArticleStatus;
  action: NewsEditorialAction;
  reason: string | null;
};

export type NewsEditorialTransitionResult = {
  article: NewsArticle;
  decision: NewsEditorialDecision;
};
