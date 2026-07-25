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
import { UsersModule } from '../users/users.module';

import { MediaUploadPolicyService } from './application/services/media-upload-policy.service';
import { MediaUploadSessionService } from './application/services/media-upload-session.service';
import { MediaBinaryUploadService } from './application/services/media-binary-upload.service';
import { MediaMimeInspectionService } from './application/services/media-mime-inspection.service';
import { MEDIA_UPLOAD_SESSION_REPOSITORY } from './domain/repositories/media-upload-session.repository.interface';
import { MEDIA_REPOSITORY } from './domain/repositories/media.repository.interface';
import { PrismaMediaUploadSessionRepository } from './infrastructure/repositories/prisma-media-upload-session.repository';
import { PrismaMediaRepository } from './infrastructure/repositories/prisma-media.repository';
import { MediaResolver } from './presentation/graphql/resolvers/media.resolver';
import { MediaUploadController } from './presentation/http/media-upload.controller';
import { AvatarService } from './application/services/avatar.service';
import { MediaDeliveryService } from './application/services/media-delivery.service';
import { AVATAR_REPOSITORY } from './domain/repositories/avatar.repository.interface';
import { PrismaAvatarRepository } from './infrastructure/repositories/prisma-avatar.repository';
import { MediaDeliveryController } from './presentation/http/media-delivery.controller';
import { MediaAccessService } from './application/services/media-access.service';
import { MediaUrlSignerService } from './application/services/media-url-signer.service';
import { MediaRetentionService } from './application/services/media-retention.service';
import { MediaQuarantineService } from './application/services/media-quarantine.service';
import { MediaLibraryService } from './application/services/media-library.service';
import { MediaJobService } from './application/services/media-job.service';

@Module({
  imports: [StorageModule, UsersModule],
  providers: [
    AvatarService,
    MediaAccessService,
    MediaDeliveryService,
    MediaUrlSignerService,
    MediaRetentionService,
    MediaQuarantineService,
    MediaLibraryService,
    MediaJobService,
    MediaBinaryUploadService,
    MediaMimeInspectionService,
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
    {
      provide: AVATAR_REPOSITORY,
      useClass: PrismaAvatarRepository,
    },
  ],
  controllers: [MediaUploadController, MediaDeliveryController],
  exports: [
    AvatarService,
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
