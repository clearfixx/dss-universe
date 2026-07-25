/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/presentation/graphql/mappers/media-quarantine-graphql.mapper.ts
 *
 * 🎯 Purpose:
 * Maps Media domain entities to administrative quarantine GraphQL models.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { MediaEntity } from '../../../domain/entities/media.entity';
import type { MediaQuarantineModel } from '../models/media-quarantine.model';

export class MediaQuarantineGraphqlMapper {
  static toModel(media: MediaEntity): MediaQuarantineModel {
    const record = media.toJSON();
    return {
      id: record.id,
      ownerId: record.ownerId,
      originalFilename: record.originalFilename,
      mimeType: record.mimeType,
      size: record.size,
      status: record.status,
      failureCode: record.failureCode,
      failureReason: record.failureReason,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
