/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/domain/ports/comment-document-normalizer.interface.ts
 *
 * 🎯 Purpose:
 * Defines the canonical COMMENT projection required by comment and draft use cases.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { EditorDocument } from '@dss/editor';
export type CommentDocumentProjection = {
  document: EditorDocument;
  canonicalJson: string;
  plainText: string;
  searchText: string;
};
export interface CommentDocumentNormalizer {
  normalize(documentJson: string): CommentDocumentProjection;
}
export const COMMENT_DOCUMENT_NORMALIZER = Symbol(
  'COMMENT_DOCUMENT_NORMALIZER',
);
