/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Content Access
 * 📄 File: apps/api/src/modules/content-access/contracts/content-gate-policy-evaluator.contract.ts
 *
 * 🎯 Purpose:
 * Publishes the existing management policy verdict without viewer-evidence internals.
 *
 * 🏗️ Architecture:
 * Named owner capability; no foreign service, ORM or transport dependency.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { ContentGatePolicyEvaluation } from './content-gate-policy-view.type';
export const CONTENT_GATE_POLICY_EVALUATOR = Symbol(
  'CONTENT_GATE_POLICY_EVALUATOR',
);
export interface ContentGatePolicyEvaluator {
  evaluate(
    gateId: string,
    viewerId: string,
  ): Promise<ContentGatePolicyEvaluation>;
}
