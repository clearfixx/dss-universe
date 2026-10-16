/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM
 * 📄 File: apps/api/src/modules/iam/contracts/membership-grant-transaction.port.ts
 *
 * 🎯 Purpose:
 * Defines atomic access membership grants without subject lookup or ORM callbacks.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type {
  GrantAccessMembership,
  MembershipRecord,
} from '../access-groups/domain/access-group.types';
export interface MembershipGrantTransaction {
  grant(
    input: GrantAccessMembership,
    actorId: string,
  ): Promise<MembershipRecord | null>;
}
export const MEMBERSHIP_GRANT_TRANSACTION = Symbol(
  'MEMBERSHIP_GRANT_TRANSACTION',
);
