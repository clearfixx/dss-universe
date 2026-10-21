/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/contracts/profile-asset-transaction.port.ts
 *
 * 🎯 Purpose:
 * Defines atomic profile-asset persistence without leaking a transaction client.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type ProfileAssetSlot = 'AVATAR' | 'COVER';
export type ProfileAssetAssignment = Readonly<{
  slot: ProfileAssetSlot;
  subjectId: string;
  actorId: string;
  mediaId: string;
  url: string;
}>;
export interface ProfileAssetTransaction {
  assign(input: ProfileAssetAssignment): Promise<void>;
  remove(
    slot: ProfileAssetSlot,
    subjectId: string,
    actorId: string,
  ): Promise<void>;
}
export const PROFILE_ASSET_TRANSACTION = Symbol('PROFILE_ASSET_TRANSACTION');
