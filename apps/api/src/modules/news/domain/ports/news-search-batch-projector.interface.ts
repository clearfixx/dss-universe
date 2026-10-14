/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News
 * 📄 File: apps/api/src/modules/news/domain/ports/news-search-batch-projector.interface.ts
 *
 * 🎯 Purpose:
 * Requires ordered viewer-safe text for a bounded canonical search batch without access facts.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export interface NewsSearchBatchProjector {
  project(
    documents: readonly string[],
    viewerId: string,
  ): Promise<readonly Readonly<{ searchText: string }>[]>;
}
export const NEWS_SEARCH_BATCH_PROJECTOR = Symbol(
  'NEWS_SEARCH_BATCH_PROJECTOR',
);
