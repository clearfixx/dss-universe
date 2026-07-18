/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/presentation/http/media-upload.controller.ts
 *
 * 🎯 Purpose:
 * Exposes authenticated multipart binary intake for Media upload sessions.
 *
 * 🧠 Responsibilities:
 * • receives one in-memory multipart file;
 * • delegates all validation and orchestration to the application layer;
 * • returns a storage-safe upload-session response.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import {
  BadRequestException,
  Controller,
  Param,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { AuthUser, Authenticated } from '@api/core/auth';
import type { AuthenticatedUser } from '@api/core/auth';

import { MediaBinaryUploadService } from '../../application/services/media-binary-upload.service';
import type { UploadedMediaFile } from '../../application/types/uploaded-media-file.type';
import { MediaUploadSessionGraphqlMapper } from '../graphql/mappers/media-upload-session-graphql.mapper';
import type { MediaUploadSessionModel } from '../graphql/models/media-upload-session.model';

const MAX_MULTIPART_FILE_SIZE = 25 * 1024 * 1024;

@Controller('media/uploads')
export class MediaUploadController {
  constructor(private readonly binaryUploads: MediaBinaryUploadService) {}

  @Put(':id/content')
  @Authenticated()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { files: 1, fileSize: MAX_MULTIPART_FILE_SIZE },
    }),
  )
  async upload(
    @AuthUser() user: AuthenticatedUser,
    @Param('id') sessionId: string,
    @UploadedFile() file?: UploadedMediaFile,
  ): Promise<MediaUploadSessionModel> {
    if (!file) {
      throw new BadRequestException(
        'A multipart file field named "file" is required.',
      );
    }

    const session = await this.binaryUploads.accept(user.id, sessionId, file);
    return MediaUploadSessionGraphqlMapper.toModel(session);
  }
}
