/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/infrastructure/mappers/prisma-media-upload-session.mapper.ts
 *
 * 🎯 Purpose:
 * Maps Prisma upload-session records into Media domain contracts.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { MediaUploadSession as PrismaMediaUploadSession } from '@prisma/client';

import { MediaStorageProvider } from '../../domain/enums/media-storage-provider.enum';
import { MediaUploadStatus } from '../../domain/enums/media-upload-status.enum';
import type { MediaUploadSession } from '../../domain/types/media-upload-session.type';
import type { MediaUploadPolicyKey } from '../../domain/types/media-upload-policy.type';
import { PrismaMediaMapper } from './prisma-media.mapper';

export class PrismaMediaUploadSessionMapper {
  static toDomain(record: PrismaMediaUploadSession): MediaUploadSession {
    return {
      ...record,
      policyKey: record.policyKey as MediaUploadPolicyKey,
      status: record.status as MediaUploadStatus,
      storageProvider: record.storageProvider as MediaStorageProvider,
      metadata: PrismaMediaMapper.toMetadata(record.metadata),
    };
  }
}
