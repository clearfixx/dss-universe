/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Platform
 * 📄 File: apps/api/src/modules/editor/domain/ports/editor-gate-decision-scopes.interface.ts
 *
 * 🎯 Purpose:
 * Requires viewer-bound, explicitly closed gate verdicts for a bounded projection batch.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { EditorGateDecision } from './editor-gate-decisions.interface';
export interface EditorGateDecisionScope {
  evaluate(gateId: string): Promise<EditorGateDecision>;
  close(): void;
}
export interface EditorGateDecisionScopes {
  open(viewerId: string): EditorGateDecisionScope;
}
export const EDITOR_GATE_DECISION_SCOPES = Symbol(
  'EDITOR_GATE_DECISION_SCOPES',
);
