/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/application/services/media-job.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies permission-safe and compensating Media processing retries.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { MediaProcessingJob } from '@dss/jobs';

import type { AuthenticatedUser } from '@api/core/auth';
import { Permission } from '@api/core/authorization';

import { MediaEntity } from '../../domain/entities/media.entity';
import { MediaKind } from '../../domain/enums/media-kind.enum';
import { MediaStatus } from '../../domain/enums/media-status.enum';
import { MediaStorageProvider } from '../../domain/enums/media-storage-provider.enum';
import { MediaVisibility } from '../../domain/enums/media-visibility.enum';
import type { MediaRepository } from '../../domain/repositories/media.repository.interface';
import { MediaJobService } from './media-job.service';

const JOB: MediaProcessingJob = {
  mediaId: 'media-1',
  uploadSessionId: 'upload-1',
  ownerId: 'owner-1',
  policyKey: 'attachment',
  storageProvider: 'LOCAL',
  bucket: 'media',
  temporaryKey: 'temporary/owner-1/upload-1',
  originalFilename: 'document.pdf',
  mimeType: 'application/pdf',
  size: 1024,
  checksum: 'a'.repeat(64),
  scanRequired: true,
  processingKind: 'PASSTHROUGH',
  destinationKey: 'media/owner-1/media-1/original.pdf',
  variants: [],
  queuedAt: '2026-07-25T00:00:00.000Z',
};

function mediaRecord(status: MediaStatus): MediaEntity {
  return new MediaEntity({
    id: JOB.mediaId,
    ownerId: JOB.ownerId,
    kind: MediaKind.DOCUMENT,
    status,
    visibility: MediaVisibility.PRIVATE,
    storageProvider: MediaStorageProvider.LOCAL,
    bucket: JOB.bucket,
    storageKey: JOB.destinationKey,
    originalFilename: JOB.originalFilename,
    mimeType: JOB.mimeType,
    extension: 'pdf',
    size: JOB.size,
    checksum: JOB.checksum,
    width: null,
    height: null,
    durationMs: null,
    altText: null,
    caption: null,
    metadata: { processingJob: JOB },
    failureCode: status === MediaStatus.FAILED ? 'PROCESSING_FAILED' : null,
    failureReason: status === MediaStatus.FAILED ? 'Sharp failed' : null,
    readyAt: null,
    createdAt: new Date('2026-07-25T00:00:00.000Z'),
    updatedAt: new Date('2026-07-25T00:01:00.000Z'),
    deletedAt: null,
  });
}

describe('MediaJobService', () => {
  const media = {
    findById: jest.fn(),
    claimFailedRetry: jest.fn(),
    recordFailedRetryQueueFailure: jest.fn(),
  };
  const queueAdd = jest.fn();
  const service = new MediaJobService(
    media as unknown as MediaRepository,
    { mediaProcessing: { add: queueAdd } } as never,
  );
  const manager: AuthenticatedUser = {
    id: 'admin-1',
    sessionId: 'session-1',
    email: 'admin@dss.test',
    username: 'admin',
    roles: [],
    permissions: [Permission.MediaJobsManage],
  };

  beforeEach(() => {
    jest.resetAllMocks();
    media.findById.mockResolvedValue(mediaRecord(MediaStatus.FAILED));
    media.claimFailedRetry.mockResolvedValue(
      mediaRecord(MediaStatus.PROCESSING),
    );
    media.recordFailedRetryQueueFailure.mockResolvedValue(undefined);
    queueAdd.mockResolvedValue(undefined);
  });

  it('claims and dispatches a failed processing contract', async () => {
    await expect(
      service.retryFailed(manager, JOB.mediaId),
    ).resolves.toMatchObject({ status: MediaStatus.PROCESSING });
    expect(media.claimFailedRetry).toHaveBeenCalledWith(
      JOB.mediaId,
      manager.id,
    );
    expect(queueAdd).toHaveBeenCalledWith(
      'process-media-upload.v1',
      expect.objectContaining({ mediaId: JOB.mediaId }),
      expect.objectContaining({ attempts: 3 }),
    );
  });

  it('restores FAILED state when queue dispatch fails', async () => {
    queueAdd.mockRejectedValue(new Error('Redis unavailable'));
    await expect(service.retryFailed(manager, JOB.mediaId)).rejects.toThrow(
      'Redis unavailable',
    );
    expect(media.recordFailedRetryQueueFailure).toHaveBeenCalledWith(
      JOB.mediaId,
      manager.id,
      'Redis unavailable',
    );
  });

  it('denies retries without the management permission', async () => {
    await expect(
      service.retryFailed({ ...manager, permissions: [] }, JOB.mediaId),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(media.findById).not.toHaveBeenCalled();
  });

  it('does not retry media outside FAILED state', async () => {
    media.findById.mockResolvedValue(mediaRecord(MediaStatus.READY));
    await expect(
      service.retryFailed(manager, JOB.mediaId),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(media.claimFailedRetry).not.toHaveBeenCalled();
  });
});
