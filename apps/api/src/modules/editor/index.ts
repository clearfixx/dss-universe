/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Platform
 * 📄 File: apps/api/src/modules/editor/index.ts
 *
 * 🎯 Purpose:
 * Exposes named normalization, redaction and search contracts, never concrete services.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export { EditorModule } from './editor.module';
export {
  EDITOR_SEARCH_BATCH_PROJECTOR,
  type EditorSearchBatchProjector,
} from './contracts/editor-search-batch-projector.contract';
export {
  EDITOR_GATE_DECISION_SCOPES,
  type EditorGateDecisionScope,
  type EditorGateDecisionScopes,
} from './domain/ports/editor-gate-decision-scopes.interface';
export {
  EDITOR_SEARCH_PROJECTOR,
  type EditorSearchProjector,
} from './contracts/editor-search-projector.contract';
export {
  EDITOR_VIEWER_DOCUMENT_PROJECTOR,
  type EditorViewerDocumentProjector,
} from './contracts/editor-viewer-document-projector.contract';
export {
  EDITOR_DOCUMENT_NORMALIZER,
  type EditorDocumentNormalizer,
  type ValidatedEditorDocument,
} from './contracts/editor-document-normalizer.contract';
export {
  EDITOR_GATE_DECISIONS,
  type EditorGateDecisions,
  type EditorGateDecision,
  type EditorGateRequirement,
} from './domain/ports/editor-gate-decisions.interface';

/** Consumers request projections; they do not invent document schemas. */
