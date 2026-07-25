/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/presentation/graphql/mappers/media-library-graphql.mapper.ts
 *
 * 🎯 Purpose:
 * Maps Media domain entities to storage-safe Media Library GraphQL items.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { MediaEntity } from '../../../domain/entities/media.entity';
import type { MediaLibraryItemModel } from '../models/media-library.model';

export class MediaLibraryGraphqlMapper {
  static toItem(media: MediaEntity): MediaLibraryItemModel {
    const record = media.toJSON();
    return {
      id: record.id,
      ownerId: record.ownerId,
      kind: record.kind,
      status: record.status,
      visibility: record.visibility,
      originalFilename: record.originalFilename,
      mimeType: record.mimeType,
      extension: record.extension,
      size: record.size,
      width: record.width,
      height: record.height,
      failureCode: record.failureCode,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
