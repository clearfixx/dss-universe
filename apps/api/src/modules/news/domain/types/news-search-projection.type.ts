/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News
 * 📄 File: apps/api/src/modules/news/domain/types/news-search-projection.type.ts
 *
 * 🎯 Purpose:
 * Defines owned source snapshots and derived search evidence without ORM handles.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type NewsSearchSource = Readonly<{
  articleId: string;
  sourceVersion: number;
  documentJson: string;
}>;

export type NewsSearchProjectionWrite = NewsSearchSource &
  Readonly<{
    projectionVersion: number;
    publicSearchText: string;
    hasContentGates: boolean;
  }>;

export type NewsSearchBackfillResult = Readonly<{
  processed: number;
  installed: number;
  conflicts: number;
  remaining: number;
}>;
