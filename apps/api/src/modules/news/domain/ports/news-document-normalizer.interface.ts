/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News
 * 📄 File: apps/api/src/modules/news/domain/ports/news-document-normalizer.interface.ts
 *
 * 🎯 Purpose:
 * Defines only the validated document and text projections needed by News drafts.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { EditorDocument } from '@dss/editor';
export type NewsDocumentProjection = {
  document: EditorDocument;
  plainText: string;
  searchText: string;
};
export interface NewsDocumentNormalizer {
  normalize(documentJson: string): NewsDocumentProjection;
}
export const NEWS_DOCUMENT_NORMALIZER = Symbol('NEWS_DOCUMENT_NORMALIZER');
