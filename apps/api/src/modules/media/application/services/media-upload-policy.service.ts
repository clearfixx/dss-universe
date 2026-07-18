/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/application/services/media-upload-policy.service.ts
 *
 * 🎯 Purpose:
 * Resolves and validates declared uploads against Media v1 policies.
 *
 * 🧠 Responsibilities:
 * • owns the initial upload-policy registry;
 * • validates declared file size, MIME type, and extension;
 * • returns normalized metadata for upload orchestration.
 *
 * ⚠️ Important:
 * Declared metadata validation does not replace binary MIME inspection.
 * The processing pipeline must inspect actual file contents later.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Injectable } from '@nestjs/common';
import { extname } from 'node:path';

import { MediaUploadPolicyException } from '../../domain/exceptions/media-upload-policy.exception';
import { MediaKind } from '../../domain/enums/media-kind.enum';
import { MediaVisibility } from '../../domain/enums/media-visibility.enum';
import type {
  MediaUploadPolicy,
  MediaUploadPolicyKey,
  ValidatedMediaUpload,
  ValidateMediaUploadInput,
} from '../../domain/types/media-upload-policy.type';

const MEBIBYTE = 1024 * 1024;
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const;

@Injectable()
export class MediaUploadPolicyService {
  private readonly policies: Readonly<
    Record<MediaUploadPolicyKey, MediaUploadPolicy>
  > = {
    avatar: this.imagePolicy('avatar', MediaVisibility.PUBLIC),
    cover: this.imagePolicy('cover', MediaVisibility.PUBLIC),
    'content-image': this.imagePolicy('content-image', MediaVisibility.PRIVATE),
    attachment: {
      key: 'attachment',
      kind: MediaKind.DOCUMENT,
      visibility: MediaVisibility.PRIVATE,
      maximumBytes: 25 * MEBIBYTE,
      allowedMimeTypes: [
        'application/pdf',
        'application/zip',
        'text/plain',
        'text/markdown',
      ],
      allowedExtensions: ['pdf', 'zip', 'txt', 'md'],
    },
  };

  getPolicy(key: MediaUploadPolicyKey): MediaUploadPolicy {
    return this.policies[key];
  }

  validate(input: ValidateMediaUploadInput): ValidatedMediaUpload {
    const policy = this.getPolicy(input.policyKey);
    const normalizedMimeType = input.declaredMimeType.trim().toLowerCase();
    const extension = extname(input.originalFilename).slice(1).toLowerCase();

    if (!Number.isSafeInteger(input.declaredSize) || input.declaredSize <= 0) {
      throw new MediaUploadPolicyException(
        'Declared file size must be a positive safe integer.',
      );
    }

    if (input.declaredSize > policy.maximumBytes) {
      throw new MediaUploadPolicyException(
        `File exceeds the ${policy.maximumBytes}-byte upload limit for ${policy.key}.`,
      );
    }

    if (!policy.allowedMimeTypes.includes(normalizedMimeType)) {
      throw new MediaUploadPolicyException(
        `MIME type ${normalizedMimeType || '(empty)'} is not allowed for ${policy.key}.`,
      );
    }

    if (!extension || !policy.allowedExtensions.includes(extension)) {
      throw new MediaUploadPolicyException(
        `File extension ${extension || '(missing)'} is not allowed for ${policy.key}.`,
      );
    }

    return {
      policy,
      extension,
      normalizedMimeType,
    };
  }

  private imagePolicy(
    key: MediaUploadPolicyKey,
    visibility: MediaVisibility,
  ): MediaUploadPolicy {
    return {
      key,
      kind: MediaKind.IMAGE,
      visibility,
      maximumBytes: 5 * MEBIBYTE,
      allowedMimeTypes: IMAGE_MIME_TYPES,
      allowedExtensions: IMAGE_EXTENSIONS,
    };
  }
}
