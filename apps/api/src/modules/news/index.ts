/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News
 * 📄 File: apps/api/src/modules/news/index.ts
 *
 * 🎯 Purpose:
 * Publishes explicit News integration ports and their reviewed data types.
 * Concrete services and repositories remain private to the owner.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export { NEWS_SEARCH_PROJECTION_VERSION } from './domain/constants/news-search-projection.constant';
export {
  NEWS_DELIVERY_READER,
  type NewsDeliveryReader,
} from './domain/ports/news-delivery-reader.interface';
export type { NewsFullRecord } from './domain/types/news-full-record.type';
export type {
  NewsCommentItem,
  NewsCommentsPage,
} from './domain/types/news-comment.type';
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
export type {
  ShortNewsQuery,
  ShortNewsNumberedQuery,
  ShortNewsItem,
  NewsRatingVote,
} from './domain/types/short-news.type';
export type {
  NewsArticle,
  CreateNewsDraft,
  SaveNewsDraft,
} from './domain/types/news-article.type';
export { NewsModule } from './news.module';
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
  type NewsInteractionViewer,
} from './contracts/news-interaction-decisions.contract';
export {
  NEWS_MEDIA_EVIDENCE,
  type NewsMediaEvidenceReader,
  type NewsMediaEvidence,
} from './domain/ports/news-media-evidence.interface';
