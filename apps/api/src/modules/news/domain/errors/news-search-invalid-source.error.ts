/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News
 * 📄 File: apps/api/src/modules/news/domain/errors/news-search-invalid-source.error.ts
 *
 * 🎯 Purpose:
 * Identifies a repair-required source without retaining protected validation payloads.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export class NewsSearchInvalidSourceError extends Error {
  constructor(readonly articleId: string) {
    super(`News search source requires canonical repair: ${articleId}.`);
    this.name = 'NewsSearchInvalidSourceError';
  }
}
