/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Access
 * 📄 File: apps/api/src/modules/content-access/contracts/content-gate-decisions.contract.ts
 *
 * 🎯 Purpose:
 * Publishes viewer decisions without gate owners, thresholds or persistence records.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export const CONTENT_GATE_REQUIREMENT_KINDS = [
  'ACCOUNT_AGE_DAYS',
  'COMMENTS',
  'FORUM_POSTS',
  'PUBLICATIONS',
  'REPUTATION',
  'GROUP',
] as const;
export type ContentGateRequirementKind =
  (typeof CONTENT_GATE_REQUIREMENT_KINDS)[number];
export type ContentGateDecision = {
  gateId: string;
  allowed: boolean;
  bypassed: boolean;
  unmet: ContentGateRequirementKind[];
  notice: string;
};
export interface ContentGateDecisions {
  evaluate(
    gateId: string,
    viewerId: string | null,
  ): Promise<ContentGateDecision>;
}
export const CONTENT_GATE_DECISIONS = Symbol('CONTENT_GATE_DECISIONS');
