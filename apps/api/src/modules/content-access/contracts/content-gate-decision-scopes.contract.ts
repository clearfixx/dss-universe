/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Access
 * 📄 File: apps/api/src/modules/content-access/contracts/content-gate-decision-scopes.contract.ts
 *
 * 🎯 Purpose:
 * Exposes bounded-lifetime verdict evaluation without exporting viewer evidence or gate definitions.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { ContentGateDecision } from './content-gate-decisions.contract';

export interface ContentGateDecisionScope {
  evaluate(gateId: string): Promise<ContentGateDecision>;
  close(): void;
}
export interface ContentGateDecisionScopes {
  open(viewerId: string): ContentGateDecisionScope;
}
export const CONTENT_GATE_DECISION_SCOPES = Symbol(
  'CONTENT_GATE_DECISION_SCOPES',
);
