/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/application/services/media-binary-upload.service.ts
 *
 * 🎯 Purpose:
 * Accepts, inspects, persists, and queues binaries for Media processing.
 *
 * 🧠 Responsibilities:
 * • enforces upload-session lifecycle and ownership;
 * • verifies actual size, MIME type, and optional SHA-256 checksum;
 * • persists the accepted binary through Core Storage;
 * • queues a typed media-processing job;
 * • compensates storage and session state when intake fails.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { basename, dirname } from 'node:path';
import { DSS_JOB_NAMES, type MediaProcessingJob } from '@dss/jobs';

import { QueueRegistryService } from '@api/core/queue';
import { StorageService } from '@api/core/storage';

import { MediaUploadStatus } from '../../domain/enums/media-upload-status.enum';
import type { MediaUploadSession } from '../../domain/types/media-upload-session.type';
import type { UploadedMediaFile } from '../types/uploaded-media-file.type';
import { MediaMimeInspectionService } from './media-mime-inspection.service';
import { MediaUploadPolicyService } from './media-upload-policy.service';
import { MediaUploadSessionService } from './media-upload-session.service';

@Injectable()
export class MediaBinaryUploadService {
  constructor(
    private readonly sessions: MediaUploadSessionService,
    private readonly policies: MediaUploadPolicyService,
    private readonly mimeInspection: MediaMimeInspectionService,
    private readonly storage: StorageService,
    private readonly queues: QueueRegistryService,
  ) {}

  async accept(
    ownerId: string,
    sessionId: string,
    file: UploadedMediaFile,
    now = new Date(),
  ): Promise<MediaUploadSession> {
    const session = await this.sessions.findOwned(ownerId, sessionId);
    this.assertAcceptableSession(session, now);
    this.assertDeclaredFile(session, file);

    const actualMimeType = this.mimeInspection.inspect(
      file.buffer,
      session.declaredMimeType,
    );
    if (actualMimeType !== session.declaredMimeType) {
      throw new UnsupportedMediaTypeException(
        `Binary MIME type ${actualMimeType} does not match declared MIME type ${session.declaredMimeType}.`,
      );
    }

    const policy = this.policies.getPolicy(session.policyKey);
    if (!policy.allowedMimeTypes.includes(actualMimeType)) {
      throw new UnsupportedMediaTypeException(
        `Binary MIME type ${actualMimeType} is not allowed for ${policy.key}.`,
      );
    }

    const checksum = createHash('sha256').update(file.buffer).digest('hex');
    if (session.checksum && session.checksum.toLowerCase() !== checksum) {
      throw new BadRequestException('Uploaded file checksum does not match.');
    }

    await this.sessions.updateStatus(session.id, MediaUploadStatus.UPLOADING);
    let stored = false;
    let queued = false;

    try {
      await this.storage.save({
        buffer: file.buffer,
        directory: dirname(session.temporaryKey),
        filename: basename(session.temporaryKey),
      });
      stored = true;

      const job: MediaProcessingJob = {
        uploadSessionId: session.id,
        ownerId,
        policyKey: session.policyKey,
        storageProvider: session.storageProvider,
        bucket: session.bucket,
        temporaryKey: session.temporaryKey,
        originalFilename: session.originalFilename,
        mimeType: actualMimeType,
        size: file.size,
        checksum,
        queuedAt: now.toISOString(),
      };
      await this.queues.mediaProcessing.add(
        DSS_JOB_NAMES.PROCESS_MEDIA_UPLOAD,
        job,
        {
          jobId: session.id,
          attempts: 3,
          backoff: { type: 'exponential', delay: 1_000 },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      );
      queued = true;

      const completedSession = await this.sessions.updateStatus(
        session.id,
        MediaUploadStatus.COMPLETED,
        now,
        { actualMimeType, actualSize: file.size, checksum },
      );
      return completedSession;
    } catch (error: unknown) {
      const compensations: Array<Promise<unknown>> = [
        this.sessions.updateStatus(session.id, MediaUploadStatus.FAILED),
      ];
      if (stored) {
        compensations.push(this.storage.delete(session.temporaryKey));
      }
      if (queued) {
        compensations.push(this.queues.mediaProcessing.remove(session.id));
      }
      await Promise.allSettled(compensations);
      throw error;
    }
  }

  private assertAcceptableSession(
    session: MediaUploadSession,
    now: Date,
  ): void {
    if (session.expiresAt.getTime() <= now.getTime()) {
      throw new GoneException('Media upload session has expired.');
    }
    if (session.status !== MediaUploadStatus.INITIATED) {
      throw new ConflictException(
        `Media upload session cannot accept content from ${session.status}.`,
      );
    }
  }

  private assertDeclaredFile(
    session: MediaUploadSession,
    file: UploadedMediaFile,
  ): void {
    if (!file.buffer.length || file.size !== file.buffer.length) {
      throw new BadRequestException('Uploaded file payload is invalid.');
    }
    if (file.size !== session.declaredSize) {
      throw new BadRequestException(
        'Uploaded file size does not match the initiated session.',
      );
    }
    if (file.originalname !== session.originalFilename) {
      throw new BadRequestException(
        'Uploaded filename does not match the initiated session.',
      );
    }
  }
}
