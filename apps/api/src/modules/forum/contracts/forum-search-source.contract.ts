/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/contracts/forum-search-source.contract.ts
 *
 * 🎯 Purpose:
 * Publishes Forum as a viewer-safe source for the shared search.
 *
 * ⚠️ Important:
 * Only topics the viewer can see right now are returned; posts containing
 * hidden (Content Gate) blocks never contribute matches or excerpts.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type ForumSearchHit = Readonly<{
  id: string;
  kind: string;
  language: string;
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: Date;
  /** Forum of the topic, so the client can show the way to it. */
  sectionId?: string;
}>;

export interface ForumSearchSource {
  search(query: {
    term: string;
    page: number;
    pageSize: number;
    viewerId?: string;
  }): Promise<{
    items: ForumSearchHit[];
    total: number;
    categories: Array<{ slug: string; total: number }>;
  }>;
}

export const FORUM_SEARCH_SOURCE = Symbol('FORUM_SEARCH_SOURCE');
