/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Community Points
 * 📄 File: apps/api/src/modules/community-points/contracts/recipient-existence.port.ts
 *
 * 🎯 Purpose:
 * Defines the single recipient-existence fact needed by points policies.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export interface PointsRecipientExistence {
  exists(subjectId: string): Promise<boolean>;
}
export const POINTS_RECIPIENT_EXISTENCE = Symbol('POINTS_RECIPIENT_EXISTENCE');
