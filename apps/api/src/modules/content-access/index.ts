/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Access
 * 📄 File: apps/api/src/modules/content-access/index.ts
 *
 * 🎯 Purpose:
 * Exposes minimal gate verdicts and owner-specific audience inputs by name.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export { ContentAccessModule } from './content-access.module';
export {
  CONTENT_GATE_CREATOR,
  type ContentGateCreator,
} from './contracts/content-gate-creator.contract';
export {
  CONTENT_GATE_POLICY_EVALUATOR,
  type ContentGatePolicyEvaluator,
} from './contracts/content-gate-policy-evaluator.contract';
export type {
  ContentGatePolicyOperator,
  ContentGatePolicyRequirement,
  ContentGatePolicyView,
  ContentGatePolicyEvaluation,
  ContentGatePolicyCreation,
} from './contracts/content-gate-policy-view.type';
export {
  CONTENT_GATE_DECISION_SCOPES,
  type ContentGateDecisionScope,
  type ContentGateDecisionScopes,
} from './contracts/content-gate-decision-scopes.contract';
export {
  GATE_ACCOUNT_EVIDENCE,
  type GateAccountEvidenceReader,
  type GateAccountEvidence,
} from './domain/ports/gate-account-evidence.interface';
export {
  GATE_COMMENT_COUNT,
  type GateCommentCountReader,
} from './domain/ports/gate-comment-count.interface';
export {
  GATE_REPUTATION_TOTAL,
  type GateReputationTotalReader,
} from './domain/ports/gate-reputation-total.interface';
export {
  CONTENT_GATE_DECISIONS,
  type ContentGateDecisions,
  type ContentGateDecision,
  type ContentGateRequirementKind,
} from './contracts/content-gate-decisions.contract';
export {
  CONTENT_AUDIENCE_READER,
  type ContentAudienceReader,
} from './domain/ports/content-audience-reader.interface';

/** One public hatch keeps gate internals out of neighboring modules. */
