/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/domain/types/media-upload-policy.type.ts
 *
 * 🎯 Purpose:
 * Defines stable upload policy contracts for Media v1 consumers.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { MediaKind } from '../enums/media-kind.enum';
import type { MediaVisibility } from '../enums/media-visibility.enum';

export type MediaUploadPolicyKey =
  | 'avatar'
  | 'cover'
  | 'content-image'
  | 'attachment';

export type MediaUploadPolicy = {
  key: MediaUploadPolicyKey;
  kind: MediaKind;
  visibility: MediaVisibility;
  maximumBytes: number;
  allowedMimeTypes: readonly string[];
  allowedExtensions: readonly string[];
};

export type ValidateMediaUploadInput = {
  policyKey: MediaUploadPolicyKey;
  originalFilename: string;
  declaredMimeType: string;
  declaredSize: number;
};

export type ValidatedMediaUpload = {
  policy: MediaUploadPolicy;
  extension: string;
  normalizedMimeType: string;
};
