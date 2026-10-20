/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News
 * 📄 File: apps/api/src/modules/news/contracts/news-interaction-decisions.contract.ts
 *
 * 🎯 Purpose:
 * Publishes only News-owned decisions and the minimal coordinates required to evaluate them.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type NewsInteractionViewer = 'GUEST' | 'AUTHENTICATED';
export type NewsInteractionCapability =
  | 'READ'
  | 'COMMENT'
  | 'REACT'
  | 'BOOKMARK'
  | 'SHARE';
export type NewsInteractionRequest = Readonly<{
  articleId: string;
  interactionTargetId: string;
  viewer: NewsInteractionViewer;
  capability: NewsInteractionCapability;
}>;
export type NewsInteractionDecision = Readonly<{
  allowed: boolean;
  reason?: string;
}>;
export interface NewsInteractionDecisions {
  authorize(request: NewsInteractionRequest): Promise<NewsInteractionDecision>;
}
export const NEWS_INTERACTION_DECISIONS = Symbol('NEWS_INTERACTION_DECISIONS');
