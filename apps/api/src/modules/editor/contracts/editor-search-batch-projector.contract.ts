/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Platform
 * 📄 File: apps/api/src/modules/editor/contracts/editor-search-batch-projector.contract.ts
 *
 * 🎯 Purpose:
 * Publishes ordered viewer-safe NEWS text for at most 64 canonical documents per operation.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export interface EditorSearchBatchProjector {
  project(
    documents: readonly string[],
    viewerId: string,
  ): Promise<readonly Readonly<{ searchText: string }>[]>;
}
export const EDITOR_SEARCH_BATCH_PROJECTOR = Symbol(
  'EDITOR_SEARCH_BATCH_PROJECTOR',
);
