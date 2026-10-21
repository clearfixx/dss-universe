/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/application/services/media-job.service.ts
 *
 * 🎯 Purpose:
 * Coordinates authorized retries of failed Media processing jobs.
 *
 * 🧠 Responsibilities:
 * • enforces the media-job management permission;
 * • restores the persisted immutable processing contract;
 * • claims a failed record before queue dispatch;
 * • compensates the claim when queue dispatch fails.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  DSS_JOB_NAMES,
  isMediaProcessingJob,
  type MediaProcessingJob,
} from '@dss/jobs';

import type { AuthenticatedUser } from '@api/core/auth';
import { Permission } from '@api/core/authorization';
import { QueueRegistryService } from '@api/core/queue';

import type { MediaEntity } from '../../domain/entities/media.entity';
import { MediaStatus } from '../../domain/enums/media-status.enum';
import {
  MEDIA_REPOSITORY,
  type MediaRepository,
} from '../../domain/repositories/media.repository.interface';

@Injectable()
export class MediaJobService {
  constructor(
    @Inject(MEDIA_REPOSITORY)
    private readonly media: MediaRepository,
    private readonly queues: QueueRegistryService,
  ) {}

  async retryFailed(
    actor: AuthenticatedUser,
    mediaId: string,
  ): Promise<MediaEntity> {
    this.assertCanManage(actor);
    const failed = await this.media.findById(mediaId);
    if (!failed || failed.status !== MediaStatus.FAILED) {
      throw new NotFoundException('Failed media was not found.');
    }
    const job = this.processingJob(failed);
    const claimed = await this.media.claimFailedRetry(mediaId, actor.id);
    if (!claimed) {
      throw new NotFoundException('Failed media was not found.');
    }

    try {
      await this.queues.mediaProcessing.add(
        DSS_JOB_NAMES.PROCESS_MEDIA_UPLOAD,
        { ...job, queuedAt: new Date().toISOString() },
        {
          jobId: `${job.uploadSessionId}:retry:${randomUUID()}`,
          attempts: 3,
          backoff: { type: 'exponential', delay: 1_000 },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      );
    } catch (error: unknown) {
      const reason =
        error instanceof Error ? error.message : 'Media retry queue failed.';
      await this.media.recordFailedRetryQueueFailure(mediaId, actor.id, reason);
      throw error;
    }
    return claimed;
  }

  private processingJob(media: MediaEntity): MediaProcessingJob {
    const value = media.toJSON().metadata?.processingJob;
    if (!isMediaProcessingJob(value) || value.mediaId !== media.id) {
      throw new NotFoundException(
        'Failed media cannot be retried because its processing contract is unavailable.',
      );
    }
    return value;
  }

  private assertCanManage(actor: AuthenticatedUser): void {
    if (!actor.permissions.includes(Permission.MediaJobsManage)) {
      throw new ForbiddenException(
        'Media job management permission is required.',
      );
    }
  }
}
