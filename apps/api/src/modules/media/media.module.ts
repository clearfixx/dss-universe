/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/media.module.ts
 *
 * 🎯 Purpose:
 * Declares the DSS Media Platform module.
 *
 * 🧠 Responsibilities:
 * • owns media-related application, domain, infrastructure, and presentation layers;
 * • uses Core Storage for physical file persistence;
 * • provides the foundation for avatars, covers, attachments, galleries, and CMS assets.
 *
 * 🏗️ Architecture:
 * Feature module.
 * Media owns media business rules and metadata.
 * Storage owns physical file persistence.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Module } from '@nestjs/common';

import { StorageModule } from '@api/core/storage';

import { MediaUploadPolicyService } from './application/services/media-upload-policy.service';
import { MediaUploadSessionService } from './application/services/media-upload-session.service';
import { MEDIA_UPLOAD_SESSION_REPOSITORY } from './domain/repositories/media-upload-session.repository.interface';
import { MEDIA_REPOSITORY } from './domain/repositories/media.repository.interface';
import { PrismaMediaUploadSessionRepository } from './infrastructure/repositories/prisma-media-upload-session.repository';
import { PrismaMediaRepository } from './infrastructure/repositories/prisma-media.repository';
import { MediaResolver } from './presentation/graphql/resolvers/media.resolver';

@Module({
  imports: [StorageModule],
  providers: [
    MediaUploadPolicyService,
    MediaUploadSessionService,
    MediaResolver,
    {
      provide: MEDIA_REPOSITORY,
      useClass: PrismaMediaRepository,
    },
    {
      provide: MEDIA_UPLOAD_SESSION_REPOSITORY,
      useClass: PrismaMediaUploadSessionRepository,
    },
  ],
  exports: [
    MediaUploadPolicyService,
    MediaUploadSessionService,
    MEDIA_REPOSITORY,
    MEDIA_UPLOAD_SESSION_REPOSITORY,
  ],
})
export class MediaModule {}

/**
 * -----------------------------------------------------------------------------
 * 🛰️ Media knows what the file means.
 * Storage knows where the file lives.
 * -----------------------------------------------------------------------------
 */
