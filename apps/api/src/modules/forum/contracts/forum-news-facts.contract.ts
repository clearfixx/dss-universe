/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/contracts/forum-news-facts.contract.ts
 *
 * 🎯 Purpose:
 * Consumer-owned port for the article facts needed to link a discussion.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type ForumNewsFacts = Readonly<{ authorId: string; published: boolean }>;

export interface ForumNewsFactsReader {
  find(articleId: string, at: Date): Promise<ForumNewsFacts | null>;
}

export const FORUM_NEWS_FACTS = Symbol('FORUM_NEWS_FACTS');
