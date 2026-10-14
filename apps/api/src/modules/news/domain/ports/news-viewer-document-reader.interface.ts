/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: News
 * 📄 File: apps/api/src/modules/news/domain/ports/news-viewer-document-reader.interface.ts
 *
 * 🎯 Purpose:
 * Requests viewer-safe document JSON without importing Editor or gate policies.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export const NEWS_VIEWER_DOCUMENT_READER = Symbol(
  'NEWS_VIEWER_DOCUMENT_READER',
);

export interface NewsViewerDocumentReader {
  project(
    documentJson: string,
    viewerId: string | null,
  ): Promise<Readonly<{ documentJson: string }>>;
}
