/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News
 * 📄 File: apps/api/src/modules/news/contracts/news-search-index-maintenance.contract.ts
 *
 * 🎯 Purpose:
 * Publishes only search readiness and resumable derived-index maintenance for operations.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { NewsSearchBackfillResult } from '../domain/types/news-search-projection.type';

export const NEWS_SEARCH_INDEX_MAINTENANCE = Symbol(
  'NEWS_SEARCH_INDEX_MAINTENANCE',
);

export interface NewsSearchIndexMaintenance {
  run(batchSize?: number): Promise<NewsSearchBackfillResult>;
  check(): Promise<Readonly<{ remaining: number }>>;
}
