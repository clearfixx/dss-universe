/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News
 * 📄 File: apps/api/src/modules/news/index.ts
 *
 * 🎯 Purpose:
 * Publishes existing News integration surfaces and the consumer-owned normalization port.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export * from './application/services/news.service';
export * from './application/services/news-delivery.service';
export * from './application/services/news-links.service';
export * from './application/services/news-post-template.service';
export * from './application/services/news-taxonomy.service';
export * from './application/services/news-workflow.service';
export * from './application/services/news-scheduler.service';
export * from './application/services/news-settings.service';
export * from './domain/types/news-editorial.type';
export * from './domain/types/news-links.type';
export * from './domain/types/news-settings.type';
export * from './domain/types/short-news.type';
export * from './domain/types/news-taxonomy.type';
export * from './domain/types/news-article.type';
export * from './news.module';
export {
  NEWS_DOCUMENT_NORMALIZER,
  type NewsDocumentNormalizer,
  type NewsDocumentProjection,
} from './domain/ports/news-document-normalizer.interface';
