/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News
 * 📄 File: apps/api/src/modules/news/domain/repositories/news-search-projection.repository.interface.ts
 *
 * 🎯 Purpose:
 * Defines bounded derived-index maintenance with source-checked atomic installation.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type {
  NewsSearchProjectionWrite,
  NewsSearchSource,
} from '../types/news-search-projection.type';

export const NEWS_SEARCH_PROJECTION_REPOSITORY = Symbol(
  'NEWS_SEARCH_PROJECTION_REPOSITORY',
);

export interface NewsSearchProjectionRepository {
  scanMissing(
    projectionVersion: number,
    afterId: string | null,
    take: number,
  ): Promise<readonly NewsSearchSource[]>;
  install(input: NewsSearchProjectionWrite): Promise<boolean>;
  countMissing(projectionVersion: number): Promise<number>;
}
