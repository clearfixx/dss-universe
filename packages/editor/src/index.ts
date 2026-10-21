/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Platform
 * 📄 File: packages/editor/src/index.ts
 *
 * 🎯 Purpose:
 * Exposes the shared, framework-neutral DSS Editor document contract.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export * from "./capabilities";
export * from "./autosave";
export * from "./document";
export * from "./profiles";
export {
  projectEditorPlainText,
  projectEditorSearchText,
  projectEditorPublicSearch,
} from "./projections";
export type { EditorPublicSearchProjection } from "./projections";
export * from "./validation";

/** Canonical documents travel between modules; implementation details stay home. */
