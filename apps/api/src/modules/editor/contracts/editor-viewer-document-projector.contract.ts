/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Platform
 * 📄 File: apps/api/src/modules/editor/contracts/editor-viewer-document-projector.contract.ts
 *
 * 🎯 Purpose:
 * Publishes only viewer-safe document JSON without exposing redaction internals.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export const EDITOR_VIEWER_DOCUMENT_PROJECTOR = Symbol(
  'EDITOR_VIEWER_DOCUMENT_PROJECTOR',
);

export interface EditorViewerDocumentProjector {
  project(
    documentJson: string,
    viewerId: string | null,
  ): Promise<Readonly<{ documentJson: string }>>;
}
