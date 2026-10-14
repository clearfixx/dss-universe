/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Platform
 * 📄 File: apps/api/src/modules/editor/domain/ports/editor-gate-decisions.interface.ts
 *
 * 🎯 Purpose:
 * Defines Editor-owned gate decisions consumed by recursive server-side redaction.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type EditorGateRequirement =
  | 'ACCOUNT_AGE_DAYS'
  | 'COMMENTS'
  | 'FORUM_POSTS'
  | 'PUBLICATIONS'
  | 'REPUTATION'
  | 'GROUP';
export type EditorGateDecision = {
  gateId: string;
  allowed: boolean;
  bypassed: boolean;
  unmet: EditorGateRequirement[];
  notice: string;
};
export interface EditorGateDecisions {
  evaluate(
    gateId: string,
    viewerId: string | null,
  ): Promise<EditorGateDecision>;
}
export const EDITOR_GATE_DECISIONS = Symbol('EDITOR_GATE_DECISIONS');
