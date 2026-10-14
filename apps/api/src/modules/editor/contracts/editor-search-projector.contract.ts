/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Platform
 * 📄 File: apps/api/src/modules/editor/contracts/editor-search-projector.contract.ts
 *
 * 🎯 Purpose:
 * Publishes NEWS-only search text without full authored JSON or gate policies.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export const EDITOR_SEARCH_PROJECTOR = Symbol('EDITOR_SEARCH_PROJECTOR');

export interface EditorSearchProjector {
  projectPublic(documentJson: string): Readonly<{
    searchText: string;
    hasContentGates: boolean;
  }>;
  projectForViewer(
    documentJson: string,
    viewerId: string,
  ): Promise<Readonly<{ searchText: string }>>;
}
