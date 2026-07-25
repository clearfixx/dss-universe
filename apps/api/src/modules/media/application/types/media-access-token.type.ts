/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/application/types/media-access-token.type.ts
 *
 * 🎯 Purpose:
 * Defines the minimal signed capability used for private media delivery.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type MediaAccessTokenPayload = {
  mediaId: string;
  variantName: string;
  subjectId: string;
  expiresAt: number;
};

export type IssuedMediaAccess = {
  url: string;
  expiresAt: Date;
};
