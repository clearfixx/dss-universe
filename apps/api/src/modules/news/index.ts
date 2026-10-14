/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News
 * 📄 File: apps/api/src/modules/news/index.ts
 *
 * 🎯 Purpose:
 * Publishes existing News integration surfaces and consumer-owned normalization/read ports.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export { NEWS_SEARCH_PROJECTION_VERSION } from './domain/constants/news-search-projection.constant';
export {
  NEWS_SEARCH_BATCH_PROJECTOR,
  type NewsSearchBatchProjector,
} from './domain/ports/news-search-batch-projector.interface';
export {
  NEWS_SEARCH_INDEX_MAINTENANCE,
  type NewsSearchIndexMaintenance,
} from './contracts/news-search-index-maintenance.contract';
export { NewsSearchInvalidSourceError } from './domain/errors/news-search-invalid-source.error';
export {
  NEWS_SEARCH_PROJECTOR,
  type NewsSearchProjector,
} from './domain/ports/news-search-projector.interface';
export {
  NEWS_VIEWER_DOCUMENT_READER,
  type NewsViewerDocumentReader,
} from './domain/ports/news-viewer-document-reader.interface';
export {
  NEWS_ATTACHMENT_READER,
  type NewsAttachmentReader,
  type NewsAttachmentFile,
} from './domain/ports/news-attachment-reader.interface';
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
export { NEWS_INTERACTION_KIND } from './domain/constants/news-interaction.constant';
export {
  NEWS_DRAFT_TRANSACTION,
  type NewsDraftTransaction,
} from './domain/ports/news-draft-transaction.interface';
export {
  NEWS_INTERACTION_DECISIONS,
  type NewsInteractionDecisions,
  type NewsInteractionRequest,
  type NewsInteractionDecision,
  type NewsInteractionCapability,
} from './contracts/news-interaction-decisions.contract';
export {
  NEWS_MEDIA_EVIDENCE,
  type NewsMediaEvidenceReader,
  type NewsMediaEvidence,
} from './domain/ports/news-media-evidence.interface';
