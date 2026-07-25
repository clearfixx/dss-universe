/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media Tests
 * 📄 File: apps/api/src/modules/media/application/services/media-retention.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies idempotent physical cleanup and retryable failure recording.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { ConfigService } from '@nestjs/config';

import type { StorageService } from '@api/core/storage';

import type { MediaRepository } from '../../domain/repositories/media.repository.interface';
import { MediaRetentionService } from './media-retention.service';

describe('MediaRetentionService', () => {
  const claimCleanupCandidates = jest.fn();
  const completeCleanup = jest.fn();
  const recordCleanupFailure = jest.fn();
  const repository = {
    claimCleanupCandidates,
    completeCleanup,
    recordCleanupFailure,
  } as unknown as MediaRepository;
  const remove = jest.fn();
  const storage = { delete: remove } as unknown as StorageService;
  const config = new ConfigService({
    MEDIA_RETENTION_DAYS: 30,
    MEDIA_CLEANUP_INTERVAL_MS: 0,
  });
  const service = new MediaRetentionService(repository, storage, config);

  beforeEach(() => {
    jest.clearAllMocks();
    claimCleanupCandidates.mockResolvedValue([
      {
        mediaId: 'media-1',
        storageKeys: ['original.webp', 'avatar.webp', 'avatar.webp'],
      },
    ]);
    remove.mockResolvedValue(undefined);
    completeCleanup.mockResolvedValue(undefined);
    recordCleanupFailure.mockResolvedValue(undefined);
  });

  it('deletes each storage key once and completes the lifecycle', async () => {
    await expect(
      service.runOnce(new Date('2026-07-25T00:00:00.000Z')),
    ).resolves.toBe(1);

    expect(claimCleanupCandidates).toHaveBeenCalledWith(
      new Date('2026-06-25T00:00:00.000Z'),
      50,
    );
    expect(remove).toHaveBeenCalledTimes(2);
    expect(completeCleanup).toHaveBeenCalledWith('media-1');
  });

  it('records a retryable failure without completing deletion', async () => {
    remove.mockRejectedValueOnce(new Error('storage unavailable'));

    await expect(service.runOnce()).resolves.toBe(0);

    expect(completeCleanup).not.toHaveBeenCalled();
    expect(recordCleanupFailure).toHaveBeenCalledWith(
      'media-1',
      'storage unavailable',
    );
  });
});
