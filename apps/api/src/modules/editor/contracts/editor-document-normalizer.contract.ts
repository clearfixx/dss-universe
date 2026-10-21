/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Platform
 * 📄 File: apps/api/src/modules/editor/contracts/editor-document-normalizer.contract.ts
 *
 * 🎯 Purpose:
 * Publishes profile-specific canonical document normalization without preview or delivery services.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { EditorDocument } from '@dss/editor';
export type ValidatedEditorDocument = {
  document: EditorDocument;
  canonicalJson: string;
  plainText: string;
  searchText: string;
};
export interface EditorDocumentNormalizer {
  normalizeNews(documentJson: string): ValidatedEditorDocument;
  normalizeComment(documentJson: string): ValidatedEditorDocument;
}
export const EDITOR_DOCUMENT_NORMALIZER = Symbol('EDITOR_DOCUMENT_NORMALIZER');
