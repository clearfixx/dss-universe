/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authorization
 * 📄 File: apps/api/src/core/authorization/contracts/access-capability-decisions.contract.ts
 *
 * 🎯 Purpose:
 * Publishes operation-specific access decisions, not general permission inflation.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type AudienceAccessFacts = Readonly<{
  groups: readonly string[];
  premium: boolean;
}>;
export interface AccessCapabilityDecisions {
  audience(subjectId: string, at: Date): Promise<AudienceAccessFacts | null>;
  hasKnowledgeForgeGuardian(subjectId: string, at: Date): Promise<boolean>;
  canManageGroups(subjectId: string): Promise<boolean>;
}
export const ACCESS_CAPABILITY_DECISIONS = Symbol(
  'ACCESS_CAPABILITY_DECISIONS',
);
