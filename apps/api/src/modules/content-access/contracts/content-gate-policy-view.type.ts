/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Content Access
 * 📄 File: apps/api/src/modules/content-access/contracts/content-gate-policy-view.type.ts
 *
 * 🎯 Purpose:
 * Defines the explicit policy projection required by existing management responses.
 *
 * 🏗️ Architecture:
 * Named owner capability; no foreign service, ORM or transport dependency.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type ContentGatePolicyOperator = 'ALL' | 'ANY';
export type ContentGatePolicyRequirement = Readonly<{
  id: string;
  kind:
    | 'ACCOUNT_AGE_DAYS'
    | 'COMMENTS'
    | 'FORUM_POSTS'
    | 'PUBLICATIONS'
    | 'REPUTATION'
    | 'GROUP';
  threshold: number | null;
  groupKey: string | null;
}>;
export type ContentGatePolicyView = Readonly<{
  id: string;
  ownerId: string;
  operator: ContentGatePolicyOperator;
  requirements: readonly ContentGatePolicyRequirement[];
  createdAt: Date;
  updatedAt: Date;
}>;
export type ContentGatePolicyEvaluation = Readonly<{
  gate: ContentGatePolicyView;
  allowed: boolean;
  bypassed: boolean;
  unmet: readonly ContentGatePolicyRequirement['kind'][];
  notice: string;
}>;
export type ContentGatePolicyCreation = Readonly<{
  ownerId: string;
  operator: ContentGatePolicyOperator;
  requirements: readonly Readonly<Omit<ContentGatePolicyRequirement, 'id'>>[];
}>;
