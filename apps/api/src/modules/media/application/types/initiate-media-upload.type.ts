/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/application/types/initiate-media-upload.type.ts
 *
 * 🎯 Purpose:
 * Defines application input for starting a Media v1 upload handshake.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { MediaUploadPolicyKey } from '../../domain/types/media-upload-policy.type';

export type InitiateMediaUpload = {
  policyKey: MediaUploadPolicyKey;
  originalFilename: string;
  declaredMimeType: string;
  declaredSize: number;
  checksum?: string | null;
};
