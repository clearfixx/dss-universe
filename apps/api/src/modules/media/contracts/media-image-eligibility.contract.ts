/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/contracts/media-image-eligibility.contract.ts
 *
 * 🎯 Purpose:
 * Publishes only whether an image is attachable by its owner.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export const MEDIA_IMAGE_ELIGIBILITY = Symbol('MEDIA_IMAGE_ELIGIBILITY');
export interface MediaImageEligibility {
  isAttachableImage(mediaId: string, ownerId: string): Promise<boolean>;
}
