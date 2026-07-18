/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/presentation/graphql/mappers/media-upload-session-graphql.mapper.ts
 *
 * 🎯 Purpose:
 * Maps Media upload-session contracts into safe GraphQL projections.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { MediaUploadSession } from '../../../domain/types/media-upload-session.type';
import type { MediaUploadSessionModel } from '../models/media-upload-session.model';

export class MediaUploadSessionGraphqlMapper {
  static toModel(session: MediaUploadSession): MediaUploadSessionModel {
    return {
      id: session.id,
      policyKey: session.policyKey,
      status: session.status,
      originalFilename: session.originalFilename,
      declaredMimeType: session.declaredMimeType,
      declaredSize: session.declaredSize,
      checksum: session.checksum,
      expiresAt: session.expiresAt,
      completedAt: session.completedAt,
      createdAt: session.createdAt,
    };
  }
}
