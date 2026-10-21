/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/application/services/media-quarantine.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies authorized Media quarantine listing, rescan, and rejection flows.
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
import { MediaQuarantineService } from './media-quarantine.service';

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

function quarantine(status = MediaStatus.QUARANTINED): MediaEntity {
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
    metadata: {
      uploadSessionId: JOB.uploadSessionId,
      processingJob: { ...JOB, variants: [] },
    },
    failureCode: 'MALWARE_DETECTED',
    failureReason: 'Eicar-Signature',
    readyAt: null,
    createdAt: new Date('2026-07-25T00:00:00.000Z'),
    updatedAt: new Date('2026-07-25T00:01:00.000Z'),
    deletedAt: null,
  });
}

describe('MediaQuarantineService', () => {
  const media = {
    findQuarantined: jest.fn(),
    findById: jest.fn(),
    recordQuarantineRescan: jest.fn(),
    rejectQuarantined: jest.fn(),
  };
  const queueAdd = jest.fn<
    Promise<void>,
    [
      name: string,
      data: MediaProcessingJob,
      options: { jobId: string; attempts: number },
    ]
  >();
  const service = new MediaQuarantineService(
    media as unknown as MediaRepository,
    {
      mediaProcessing: { add: queueAdd },
    } as never,
  );
  const manager: AuthenticatedUser = {
    id: 'admin-1',
    sessionId: 'session-1',
    email: 'admin@dss.test',
    username: 'admin',
    roles: [],
    permissions: [Permission.MediaQuarantineManage],
  };

  beforeEach(() => {
    jest.resetAllMocks();
    media.findQuarantined.mockResolvedValue([quarantine()]);
    media.findById.mockResolvedValue(quarantine());
    media.recordQuarantineRescan.mockResolvedValue(undefined);
    media.rejectQuarantined.mockResolvedValue(quarantine(MediaStatus.REJECTED));
    queueAdd.mockResolvedValue(undefined);
  });

  it('returns a bounded quarantine listing to an authorized manager', async () => {
    await expect(service.list(manager, 500)).resolves.toHaveLength(1);
    expect(media.findQuarantined).toHaveBeenCalledWith(100);
  });

  it('requeues the persisted immutable processing contract for rescan', async () => {
    await expect(
      service.requestRescan(manager, JOB.mediaId),
    ).resolves.toMatchObject({
      id: JOB.mediaId,
      status: MediaStatus.QUARANTINED,
    });
    expect(queueAdd).toHaveBeenCalledWith(
      'process-media-upload.v1',
      expect.objectContaining({
        mediaId: JOB.mediaId,
        scanRequired: true,
      }),
      expect.objectContaining({
        attempts: 3,
      }),
    );
    expect(media.recordQuarantineRescan).toHaveBeenCalledWith(
      JOB.mediaId,
      manager.id,
    );
  });

  it('rejects quarantined media through an audited repository transition', async () => {
    await expect(service.reject(manager, JOB.mediaId)).resolves.toMatchObject({
      status: MediaStatus.REJECTED,
    });
    expect(media.rejectQuarantined).toHaveBeenCalledWith(
      JOB.mediaId,
      manager.id,
    );
  });

  it('denies quarantine operations without the management permission', () => {
    const user = { ...manager, permissions: [] };
    expect(() => service.list(user)).toThrow(ForbiddenException);
    expect(media.findQuarantined).not.toHaveBeenCalled();
  });

  it('does not rescan non-quarantined media', async () => {
    media.findById.mockResolvedValue(quarantine(MediaStatus.READY));
    await expect(
      service.requestRescan(manager, JOB.mediaId),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(queueAdd).not.toHaveBeenCalled();
  });
});
