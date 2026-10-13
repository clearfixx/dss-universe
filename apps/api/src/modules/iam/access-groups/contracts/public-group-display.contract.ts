/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Access Group Display
 * 📄 File: apps/api/src/modules/iam/access-groups/contracts/public-group-display.contract.ts
 *
 * 🎯 Purpose:
 * Supplies current public group appearance without exposing grants or authority.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type PublicAccessGroup = Readonly<{
  key: string;
  displayName: string;
  color: string | null;
  badgeLabel: string | null;
  icon: string | null;
}>;
export interface IamPublicGroupDisplayReader {
  readPublic(
    subjectId: string,
    at: Date,
  ): Promise<readonly PublicAccessGroup[]>;
}
export const IAM_PUBLIC_GROUP_DISPLAY = Symbol('IAM_PUBLIC_GROUP_DISPLAY');
