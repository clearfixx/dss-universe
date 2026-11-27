/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/application/services/media-appeal-screenshots.service.ts
 *
 * 🎯 Purpose:
 * Runs an appeal screenshot through the regular quarantine pipeline and
 * hands reviewers the re-encoded image.
 *
 * ⚠️ Important:
 * Reviewers never receive the uploaded bytes: only the worker's re-encoded
 * "review" variant of a READY file.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import type {
  AppealScreenshot,
  AppealScreenshotUpload,
  MediaAppealScreenshots,
} from '../../contracts/appeal-screenshots.contract';
import { MediaStatus } from '../../domain/enums/media-status.enum';
import {
  MEDIA_REPOSITORY,
  type MediaRepository,
} from '../../domain/repositories/media.repository.interface';
import type { MediaMetadata } from '../../domain/types/media-metadata.type';
import { MediaBinaryUploadService } from './media-binary-upload.service';
import { MediaUploadSessionService } from './media-upload-session.service';
import { MediaUrlSignerService } from './media-url-signer.service';

const REVIEW_VARIANT = 'review';

@Injectable()
export class MediaAppealScreenshotsService implements MediaAppealScreenshots {
  constructor(
    private readonly sessions: MediaUploadSessionService,
    private readonly uploads: MediaBinaryUploadService,
    private readonly signer: MediaUrlSignerService,
    @Inject(MEDIA_REPOSITORY)
    private readonly media: MediaRepository,
  ) {}

  async intake(
    ownerId: string,
    file: AppealScreenshotUpload,
  ): Promise<AppealScreenshot> {
    const session = await this.sessions.initiate(ownerId, {
      policyKey: 'appeal-screenshot',
      originalFilename: file.originalname,
      declaredMimeType: file.mimetype,
      declaredSize: file.size,
    });
    const completed = await this.uploads.accept(ownerId, session.id, {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      buffer: file.buffer,
    });
    return {
      mediaId: this.storedId(completed.metadata),
      filename: file.originalname,
      size: file.size,
      status: 'CHECKING',
    };
  }

  private storedId(metadata: MediaMetadata | null): string {
    const mediaId = metadata?.mediaId;
    if (typeof mediaId !== 'string')
      throw new Error('Completed upload has no media id.');
    return mediaId;
  }

  async describe(mediaIds: readonly string[]): Promise<AppealScreenshot[]> {
    const found = await Promise.all(
      mediaIds.map((id) => this.media.findById(id)),
    );
    return found.flatMap((media) =>
      media
        ? [
            {
              mediaId: media.id,
              filename: media.originalFilename,
              size: media.size,
              status: this.status(media.status),
            },
          ]
        : [],
    );
  }

  async reviewAccess(
    mediaId: string,
    reviewerId: string,
  ): Promise<{ url: string; expiresAt: Date } | null> {
    const candidate = await this.media.findDeliveryCandidate(
      mediaId,
      REVIEW_VARIANT,
    );
    if (candidate?.status !== MediaStatus.READY) return null;
    const issued = this.signer.issue(mediaId, REVIEW_VARIANT, reviewerId);
    return {
      url: `/api/media/signed/${issued.token}`,
      expiresAt: new Date(issued.payload.expiresAt * 1000),
    };
  }

  private status(status: MediaStatus): AppealScreenshot['status'] {
    if (status === MediaStatus.READY) return 'READY';
    return status === MediaStatus.PENDING || status === MediaStatus.PROCESSING
      ? 'CHECKING'
      : 'REJECTED';
  }
}
