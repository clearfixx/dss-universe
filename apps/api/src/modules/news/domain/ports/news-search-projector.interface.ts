/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News
 * 📄 File: apps/api/src/modules/news/domain/ports/news-search-projector.interface.ts
 *
 * 🎯 Purpose:
 * Defines canonical public/viewer search evidence without foreign policy or persistence details.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export const NEWS_SEARCH_PROJECTOR = Symbol('NEWS_SEARCH_PROJECTOR');

export interface NewsSearchProjector {
  projectPublic(documentJson: string): Readonly<{
    searchText: string;
    hasContentGates: boolean;
  }>;
  projectForViewer(
    documentJson: string,
    viewerId: string,
  ): Promise<Readonly<{ searchText: string }>>;
}
