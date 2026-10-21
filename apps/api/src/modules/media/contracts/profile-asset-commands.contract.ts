/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/contracts/profile-asset-commands.contract.ts
 *
 * 🎯 Purpose:
 * Publishes only validated avatar/cover commands, not Media services or repositories.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export interface MediaProfileAssetCommands {
  assignAvatar(subjectId: string, mediaId: string): Promise<void>;
  removeAvatar(subjectId: string): Promise<void>;
  assignCover(subjectId: string, mediaId: string): Promise<void>;
  removeCover(subjectId: string): Promise<void>;
}
export const MEDIA_PROFILE_ASSET_COMMANDS = Symbol(
  'MEDIA_PROFILE_ASSET_COMMANDS',
);
