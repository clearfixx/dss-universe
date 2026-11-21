/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News
 * 📄 File: apps/api/src/modules/news/contracts/news-discussion-facts.contract.ts
 *
 * 🎯 Purpose:
 * Publishes the minimal facts another owner needs to link a discussion to an
 * article: its author and whether it is currently published.
 *
 * ⚠️ Important:
 * No content, audience or editorial data crosses this contract.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type NewsDiscussionFacts = Readonly<{
  articleId: string;
  authorId: string;
  published: boolean;
}>;

export interface NewsDiscussionFactsReader {
  find(articleId: string, at: Date): Promise<NewsDiscussionFacts | null>;
}

export const NEWS_DISCUSSION_FACTS = Symbol('NEWS_DISCUSSION_FACTS');
