/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/application/services/media-upload-session.service.ts
 *
 * 🎯 Purpose:
 * Orchestrates owner-scoped Media v1 upload handshakes.
 *
 * 🧠 Responsibilities:
 * • validates upload declarations through the policy registry;
 * • creates short-lived sessions with opaque storage keys;
 * • enforces session ownership and abort lifecycle rules.
 *
 * ⚠️ Important:
 * This service does not accept or inspect binary payloads.
 * Binary upload and MIME sniffing belong to the processing package.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { MediaStorageProvider } from '../../domain/enums/media-storage-provider.enum';
import { MediaUploadStatus } from '../../domain/enums/media-upload-status.enum';
import {
  MEDIA_UPLOAD_SESSION_REPOSITORY,
  type MediaUploadSessionRepository,
} from '../../domain/repositories/media-upload-session.repository.interface';
import type { MediaUploadSession } from '../../domain/types/media-upload-session.type';
import type { MediaMetadata } from '../../domain/types/media-metadata.type';
import type { InitiateMediaUpload } from '../types/initiate-media-upload.type';
import { MediaUploadPolicyService } from './media-upload-policy.service';

const UPLOAD_SESSION_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class MediaUploadSessionService {
  constructor(
    @Inject(MEDIA_UPLOAD_SESSION_REPOSITORY)
    private readonly sessions: MediaUploadSessionRepository,
    private readonly policies: MediaUploadPolicyService,
  ) {}

  initiate(
    ownerId: string,
    input: InitiateMediaUpload,
    now = new Date(),
  ): Promise<MediaUploadSession> {
    const validated = this.policies.validate(input);
    const uploadId = randomUUID();

    return this.sessions.create({
      ownerId,
      policyKey: validated.policy.key,
      storageProvider: MediaStorageProvider.LOCAL,
      bucket: 'media',
      temporaryKey: `temporary/${ownerId}/${uploadId}`,
      originalFilename: input.originalFilename,
      declaredMimeType: validated.normalizedMimeType,
      declaredSize: input.declaredSize,
      checksum: input.checksum?.trim() || null,
      expiresAt: new Date(now.getTime() + UPLOAD_SESSION_TTL_MS),
    });
  }

  async findOwned(
    ownerId: string,
    sessionId: string,
  ): Promise<MediaUploadSession> {
    const session = await this.sessions.findById(sessionId);

    if (!session || session.ownerId !== ownerId) {
      throw new NotFoundException('Media upload session was not found.');
    }

    return session;
  }

  async abort(ownerId: string, sessionId: string): Promise<MediaUploadSession> {
    const session = await this.findOwned(ownerId, sessionId);

    if (
      session.status !== MediaUploadStatus.INITIATED &&
      session.status !== MediaUploadStatus.UPLOADING
    ) {
      throw new ConflictException(
        `Media upload session cannot be aborted from ${session.status}.`,
      );
    }

    return this.sessions.updateStatus(session.id, MediaUploadStatus.ABORTED);
  }

  updateStatus(
    sessionId: string,
    status: MediaUploadStatus,
    completedAt: Date | null = null,
    metadata: MediaMetadata | null = null,
  ): Promise<MediaUploadSession> {
    return this.sessions.updateStatus(sessionId, status, completedAt, metadata);
  }
}
