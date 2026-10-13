/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Access Group Display
 * 📄 File: apps/api/src/modules/users/contracts/profile-group-display.contract.ts
 *
 * 🎯 Purpose:
 * Supplies current public group appearance without exposing grants or authority.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type ProfileGroupDisplay = Readonly<{
  key: string;
  displayName: string;
  color: string | null;
  badgeLabel: string | null;
  icon: string | null;
}>;
export interface ProfileGroupDisplayReader {
  read(subjectId: string, at: Date): Promise<readonly ProfileGroupDisplay[]>;
}
export const PROFILE_GROUP_DISPLAY = Symbol('PROFILE_GROUP_DISPLAY');
