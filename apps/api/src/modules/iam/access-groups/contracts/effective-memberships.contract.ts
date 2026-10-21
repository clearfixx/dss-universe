/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Access Groups
 * 📄 File: apps/api/src/modules/iam/access-groups/contracts/effective-memberships.contract.ts
 *
 * 🎯 Purpose:
 * Publishes only effective membership facts, never group mutation or persistence.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { EffectiveAccessMembership } from '../domain/access-group.types';
export interface IamAccessMembershipReader {
  readEffective(
    subjectId: string,
    at: Date,
  ): Promise<readonly EffectiveAccessMembership[]>;
}
export const IAM_ACCESS_MEMBERSHIPS = Symbol('IAM_ACCESS_MEMBERSHIPS');
