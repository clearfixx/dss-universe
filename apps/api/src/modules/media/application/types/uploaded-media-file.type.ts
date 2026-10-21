/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/application/types/uploaded-media-file.type.ts
 *
 * 🎯 Purpose:
 * Defines the framework-neutral binary payload accepted by Media upload intake.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type UploadedMediaFile = {
  buffer: Buffer;
  size: number;
  mimetype: string;
  originalname: string;
};
