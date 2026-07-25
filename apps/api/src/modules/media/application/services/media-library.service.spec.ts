/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/application/services/media-library.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies Media Library authorization, cursor handling, and bounded queries.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { BadRequestException, ForbiddenException } from '@nestjs/common';

import type { AuthenticatedUser } from '@api/core/auth';
import { Permission } from '@api/core/authorization';

import { MediaEntity } from '../../domain/entities/media.entity';
import { MediaKind } from '../../domain/enums/media-kind.enum';
import { MediaStatus } from '../../domain/enums/media-status.enum';
import { MediaStorageProvider } from '../../domain/enums/media-storage-provider.enum';
import { MediaVisibility } from '../../domain/enums/media-visibility.enum';
import type { MediaRepository } from '../../domain/repositories/media.repository.interface';
import { MediaLibraryService } from './media-library.service';

function media(id: string, createdAt: Date): MediaEntity {
  return new MediaEntity({
    id,
    ownerId: 'owner-1',
    kind: MediaKind.IMAGE,
    status: MediaStatus.READY,
    visibility: MediaVisibility.PRIVATE,
    storageProvider: MediaStorageProvider.LOCAL,
    bucket: 'media',
    storageKey: `media/${id}/original.webp`,
    originalFilename: `${id}.png`,
    mimeType: 'image/webp',
    extension: 'webp',
    size: 1024,
    checksum: 'a'.repeat(64),
    width: 128,
    height: 128,
    durationMs: null,
    altText: null,
    caption: null,
    metadata: null,
    failureCode: null,
    failureReason: null,
    readyAt: createdAt,
    createdAt,
    updatedAt: createdAt,
    deletedAt: null,
  });
}

describe('MediaLibraryService', () => {
  const repository = {
    browseLibrary: jest.fn(),
    getLibraryMetrics: jest.fn(),
  };
  const service = new MediaLibraryService(
    repository as unknown as MediaRepository,
  );
  const manager: AuthenticatedUser = {
    id: 'admin-1',
    email: 'admin@dss.test',
    username: 'admin',
    roles: [],
    permissions: [Permission.MediaLibraryRead],
  };
  const first = media('media-2', new Date('2026-07-25T12:00:00.000Z'));
  const second = media('media-1', new Date('2026-07-25T11:00:00.000Z'));

  beforeEach(() => {
    jest.resetAllMocks();
    repository.browseLibrary.mockResolvedValue({
      items: [first, second],
      hasNextPage: true,
    });
    repository.getLibraryMetrics.mockResolvedValue({
      totalMedia: 2,
      originalBytes: 2048,
      variantBytes: 1024,
      totalBytes: 3072,
      orphanedMedia: 1,
      failedMedia: 0,
      quarantinedMedia: 0,
    });
  });

  it('bounds queries and returns an opaque cursor for the final item', async () => {
    const result = await service.browse(manager, {
      first: 500,
      search: '  avatar  ',
      orphaned: true,
    });
    expect(repository.browseLibrary).toHaveBeenCalledWith({
      first: 100,
      search: 'avatar',
      orphaned: true,
    });
    expect(result).toMatchObject({
      items: [first, second],
      hasNextPage: true,
    });
    expect(result.endCursor).toEqual(expect.any(String));
  });

  it('decodes a previously issued cursor into repository-neutral state', async () => {
    const page = await service.browse(manager);
    repository.browseLibrary.mockClear();
    await service.browse(manager, { after: page.endCursor ?? undefined });
    expect(repository.browseLibrary).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: {
          id: second.id,
          createdAt: second.createdAt,
        },
      }),
    );
  });

  it('rejects malformed cursors', async () => {
    await expect(
      service.browse(manager, { after: 'not-a-cursor' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.browseLibrary).not.toHaveBeenCalled();
  });

  it('returns storage metrics only to authorized managers', async () => {
    await expect(service.metrics(manager)).resolves.toMatchObject({
      totalBytes: 3072,
      orphanedMedia: 1,
    });
    const user = { ...manager, permissions: [] };
    expect(() => service.metrics(user)).toThrow(ForbiddenException);
  });
});
