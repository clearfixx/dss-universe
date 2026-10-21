/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: DSS Editor Platform
 * 📄 File: apps/api/src/modules/editor/contracts/editor-preview-reader.contract.ts
 *
 * 🎯 Purpose:
 * Publishes draft preview scalars without the internal normalized document object.
 *
 * 🏗️ Architecture:
 * Named owner capability; no foreign service, ORM or transport dependency.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export const EDITOR_PREVIEW_READER = Symbol('EDITOR_PREVIEW_READER');
export type EditorPreviewView = Readonly<{
  canonicalJson: string;
  html: string;
  plainText: string;
  searchText: string;
}>;
export interface EditorPreviewReader {
  preview(documentJson: string): Promise<EditorPreviewView>;
}
