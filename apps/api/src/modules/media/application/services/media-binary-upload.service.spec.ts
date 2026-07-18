/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/application/services/media-binary-upload.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies secure Media binary intake, queueing, and compensation behavior.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { BadRequestException } from '@nestjs/common';
import { createHash } from 'node:crypto';

import type { QueueRegistryService } from '@api/core/queue';
import type { StorageService } from '@api/core/storage';

import { MediaStorageProvider } from '../../domain/enums/media-storage-provider.enum';
import { MediaUploadStatus } from '../../domain/enums/media-upload-status.enum';
import type { MediaUploadSession } from '../../domain/types/media-upload-session.type';
import { MediaBinaryUploadService } from './media-binary-upload.service';
import type { MediaMimeInspectionService } from './media-mime-inspection.service';
import { MediaUploadPolicyService } from './media-upload-policy.service';
import type { MediaUploadSessionService } from './media-upload-session.service';

const CONTENT = Buffer.from('DSS upload payload');
const CHECKSUM = createHash('sha256').update(CONTENT).digest('hex');
const SESSION: MediaUploadSession = {
  id: 'session-1',
  ownerId: 'owner-1',
  policyKey: 'attachment',
  status: MediaUploadStatus.INITIATED,
  storageProvider: MediaStorageProvider.LOCAL,
  bucket: 'media',
  temporaryKey: 'temporary/owner-1/upload-1',
  originalFilename: 'readme.txt',
  declaredMimeType: 'text/plain',
  declaredSize: CONTENT.length,
  checksum: CHECKSUM,
  metadata: null,
  expiresAt: new Date('2026-07-18T12:15:00.000Z'),
  completedAt: null,
  createdAt: new Date('2026-07-18T12:00:00.000Z'),
  updatedAt: new Date('2026-07-18T12:00:00.000Z'),
};

describe('MediaBinaryUploadService', () => {
  const sessions = {
    findOwned: jest.fn(),
    updateStatus: jest.fn(),
  };
  const mimeInspection = { inspect: jest.fn() };
  const storage = { save: jest.fn(), delete: jest.fn() };
  const queueAdd = jest.fn();
  const queueRemove = jest.fn();
  const queues = {
    mediaProcessing: { add: queueAdd, remove: queueRemove },
  };
  const service = new MediaBinaryUploadService(
    sessions as unknown as MediaUploadSessionService,
    new MediaUploadPolicyService(),
    mimeInspection as unknown as MediaMimeInspectionService,
    storage as unknown as StorageService,
    queues as unknown as QueueRegistryService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    sessions.findOwned.mockResolvedValue(SESSION);
    sessions.updateStatus.mockImplementation(
      (_id: string, status: MediaUploadStatus) =>
        Promise.resolve({ ...SESSION, status }),
    );
    mimeInspection.inspect.mockReturnValue('text/plain');
    storage.save.mockResolvedValue({
      path: SESSION.temporaryKey,
      url: `/uploads/${SESSION.temporaryKey}`,
    });
    storage.delete.mockResolvedValue(undefined);
    queueAdd.mockResolvedValue({ id: SESSION.id });
    queueRemove.mockResolvedValue(1);
  });

  it('stores inspected content and queues a typed processing job', async () => {
    await expect(
      service.accept(
        'owner-1',
        SESSION.id,
        {
          buffer: CONTENT,
          size: CONTENT.length,
          mimetype: 'application/octet-stream',
          originalname: SESSION.originalFilename,
        },
        new Date('2026-07-18T12:05:00.000Z'),
      ),
    ).resolves.toMatchObject({ status: MediaUploadStatus.COMPLETED });

    expect(storage.save).toHaveBeenCalledWith({
      buffer: CONTENT,
      directory: 'temporary/owner-1',
      filename: 'upload-1',
    });
    expect(queueAdd).toHaveBeenCalledWith(
      'process-media-upload.v1',
      expect.objectContaining({
        uploadSessionId: SESSION.id,
        mimeType: 'text/plain',
        checksum: CHECKSUM,
      }),
      expect.objectContaining({ jobId: SESSION.id, attempts: 3 }),
    );
  });

  it('rejects a payload whose actual size differs from the declaration', async () => {
    await expect(
      service.accept(
        'owner-1',
        SESSION.id,
        {
          buffer: CONTENT,
          size: CONTENT.length - 1,
          mimetype: 'text/plain',
          originalname: SESSION.originalFilename,
        },
        new Date('2026-07-18T12:05:00.000Z'),
      ),
    ).rejects.toThrow(BadRequestException);

    expect(storage.save).not.toHaveBeenCalled();
    expect(queueAdd).not.toHaveBeenCalled();
  });

  it('deletes temporary content and marks the session failed if queueing fails', async () => {
    queueAdd.mockRejectedValue(new Error('Redis unavailable'));

    await expect(
      service.accept(
        'owner-1',
        SESSION.id,
        {
          buffer: CONTENT,
          size: CONTENT.length,
          mimetype: 'text/plain',
          originalname: SESSION.originalFilename,
        },
        new Date('2026-07-18T12:05:00.000Z'),
      ),
    ).rejects.toThrow('Redis unavailable');

    expect(storage.delete).toHaveBeenCalledWith(SESSION.temporaryKey);
    expect(sessions.updateStatus).toHaveBeenLastCalledWith(
      SESSION.id,
      MediaUploadStatus.FAILED,
    );
  });

  it('removes the queued job if final session persistence fails', async () => {
    sessions.updateStatus
      .mockResolvedValueOnce({
        ...SESSION,
        status: MediaUploadStatus.UPLOADING,
      })
      .mockRejectedValueOnce(new Error('Database unavailable'))
      .mockResolvedValueOnce({
        ...SESSION,
        status: MediaUploadStatus.FAILED,
      });

    await expect(
      service.accept(
        'owner-1',
        SESSION.id,
        {
          buffer: CONTENT,
          size: CONTENT.length,
          mimetype: 'text/plain',
          originalname: SESSION.originalFilename,
        },
        new Date('2026-07-18T12:05:00.000Z'),
      ),
    ).rejects.toThrow('Database unavailable');

    expect(queueRemove).toHaveBeenCalledWith(SESSION.id);
    expect(storage.delete).toHaveBeenCalledWith(SESSION.temporaryKey);
  });
});
