/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Access Groups
 * 📄 File: apps/api/src/modules/iam/infrastructure/repositories/access-membership.shape.ts
 *
 * 🎯 Purpose:
 * Retains one owned membership projection across grant, revoke and list persistence.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export const membershipSelect = {
  id: true,
  groupId: true,
  subjectId: true,
  validFrom: true,
  validUntil: true,
  grantedById: true,
  createdAt: true,
  revokedAt: true,
  revokedById: true,
  revokeReason: true,
} as const;
