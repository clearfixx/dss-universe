/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/application/services/media-quarantine.service.ts
 *
 * 🎯 Purpose:
 * Coordinates authorized review, rescan, and rejection of quarantined Media.
 *
 * 🧠 Responsibilities:
 * • enforces the quarantine-management permission inside the use case;
 * • exposes bounded quarantine listings;
 * • requeues the immutable processing contract for malware rescan;
 * • records audited administrative decisions.
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

import { MediaStatus } from '../../domain/enums/media-status.enum';
import {
  MEDIA_REPOSITORY,
  type MediaRepository,
} from '../../domain/repositories/media.repository.interface';
import type { MediaEntity } from '../../domain/entities/media.entity';

const MAX_QUARANTINE_PAGE_SIZE = 100;

@Injectable()
export class MediaQuarantineService {
  constructor(
    @Inject(MEDIA_REPOSITORY)
    private readonly media: MediaRepository,
    private readonly queues: QueueRegistryService,
  ) {}

  list(actor: AuthenticatedUser, limit = 25): Promise<MediaEntity[]> {
    this.assertCanManage(actor);
    const boundedLimit = Math.min(
      Math.max(Math.trunc(limit), 1),
      MAX_QUARANTINE_PAGE_SIZE,
    );
    return this.media.findQuarantined(boundedLimit);
  }

  async requestRescan(
    actor: AuthenticatedUser,
    mediaId: string,
  ): Promise<MediaEntity> {
    this.assertCanManage(actor);
    const media = await this.findQuarantined(mediaId);
    const job = this.processingJob(media);
    await this.queues.mediaProcessing.add(
      DSS_JOB_NAMES.PROCESS_MEDIA_UPLOAD,
      { ...job, queuedAt: new Date().toISOString() },
      {
        jobId: `${job.uploadSessionId}:rescan:${randomUUID()}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1_000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );
    await this.media.recordQuarantineRescan(mediaId, actor.id);
    return media;
  }

  async reject(
    actor: AuthenticatedUser,
    mediaId: string,
  ): Promise<MediaEntity> {
    this.assertCanManage(actor);
    await this.findQuarantined(mediaId);
    const rejected = await this.media.rejectQuarantined(mediaId, actor.id);
    if (!rejected) {
      throw new NotFoundException('Quarantined media was not found.');
    }
    return rejected;
  }

  private async findQuarantined(mediaId: string): Promise<MediaEntity> {
    const media = await this.media.findById(mediaId);
    if (!media || media.status !== MediaStatus.QUARANTINED) {
      throw new NotFoundException('Quarantined media was not found.');
    }
    return media;
  }

  private processingJob(media: MediaEntity): MediaProcessingJob {
    const value = media.toJSON().metadata?.processingJob;
    if (!isMediaProcessingJob(value) || value.mediaId !== media.id) {
      throw new NotFoundException(
        'Quarantined media cannot be rescanned because its processing contract is unavailable.',
      );
    }
    return value;
  }

  private assertCanManage(actor: AuthenticatedUser): void {
    if (!actor.permissions.includes(Permission.MediaQuarantineManage)) {
      throw new ForbiddenException(
        'Media quarantine management permission is required.',
      );
    }
  }
}
