/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/domain/ports/wall-image-eligibility.interface.ts
 *
 * 🎯 Purpose:
 * Defines the Users-owned image eligibility input for Profile Wall posting.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export const WALL_IMAGE_ELIGIBILITY = Symbol('WALL_IMAGE_ELIGIBILITY');
export interface WallImageEligibility {
  isAttachableImage(mediaId: string, ownerId: string): Promise<boolean>;
}
