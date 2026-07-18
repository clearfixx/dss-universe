/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/domain/types/media-metadata.type.ts
 *
 * 🎯 Purpose:
 * Defines JSON-safe metadata values owned by Media domain records.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type MediaMetadataValue =
  | string
  | number
  | boolean
  | null
  | MediaMetadataValue[]
  | { [key: string]: MediaMetadataValue };

export type MediaMetadata = { [key: string]: MediaMetadataValue };
