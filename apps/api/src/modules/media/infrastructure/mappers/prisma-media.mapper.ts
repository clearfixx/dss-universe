/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/infrastructure/mappers/prisma-media.mapper.ts
 *
 * 🎯 Purpose:
 * Maps Prisma Media records into the Media domain entity.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { Media as PrismaMedia, Prisma } from '@prisma/client';

import { MediaEntity } from '../../domain/entities/media.entity';
import { MediaKind } from '../../domain/enums/media-kind.enum';
import { MediaStatus } from '../../domain/enums/media-status.enum';
import { MediaStorageProvider } from '../../domain/enums/media-storage-provider.enum';
import { MediaVisibility } from '../../domain/enums/media-visibility.enum';
import type { MediaMetadata } from '../../domain/types/media-metadata.type';

export class PrismaMediaMapper {
  static toDomain(record: PrismaMedia): MediaEntity {
    return new MediaEntity({
      ...record,
      kind: record.kind as MediaKind,
      status: record.status as MediaStatus,
      visibility: record.visibility as MediaVisibility,
      storageProvider: record.storageProvider as MediaStorageProvider,
      metadata: this.toMetadata(record.metadata),
    });
  }

  static toMetadata(value: Prisma.JsonValue | null): MediaMetadata | null {
    if (value === null || Array.isArray(value) || typeof value !== 'object') {
      return null;
    }

    return value as MediaMetadata;
  }
}
