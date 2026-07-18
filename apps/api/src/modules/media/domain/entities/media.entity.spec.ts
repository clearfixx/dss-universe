/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/domain/entities/media.entity.spec.ts
 *
 * 🎯 Purpose:
 * Verifies the frozen Media v1 lifecycle invariants.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { MediaEntity, type MediaEntityProps } from './media.entity';
import { MediaKind } from '../enums/media-kind.enum';
import { MediaStatus } from '../enums/media-status.enum';
import { MediaStorageProvider } from '../enums/media-storage-provider.enum';
import { MediaVisibility } from '../enums/media-visibility.enum';

const createProps = (): MediaEntityProps => ({
  id: 'media-1',
  ownerId: 'user-1',
  kind: MediaKind.IMAGE,
  status: MediaStatus.PENDING,
  visibility: MediaVisibility.PRIVATE,
  storageProvider: MediaStorageProvider.LOCAL,
  bucket: 'media',
  storageKey: 'pending/media-1',
  originalFilename: 'avatar.png',
  mimeType: 'image/png',
  extension: 'png',
  size: 1024,
  checksum: 'checksum',
  width: 512,
  height: 512,
  durationMs: null,
  altText: null,
  caption: null,
  metadata: null,
  failureCode: null,
  failureReason: null,
  readyAt: null,
  deletedAt: null,
  createdAt: new Date('2026-07-18T00:00:00.000Z'),
  updatedAt: new Date('2026-07-18T00:00:00.000Z'),
});

describe('MediaEntity', () => {
  it('moves through the valid upload and processing lifecycle', () => {
    const readyAt = new Date('2026-07-18T01:00:00.000Z');
    const ready = new MediaEntity(createProps())
      .transitionTo(MediaStatus.UPLOADING)
      .transitionTo(MediaStatus.PROCESSING)
      .transitionTo(MediaStatus.READY, readyAt);

    expect(ready.status).toBe(MediaStatus.READY);
    expect(ready.toJSON().readyAt).toEqual(readyAt);
  });

  it('rejects lifecycle shortcuts and makes deletion terminal', () => {
    const pending = new MediaEntity(createProps());
    expect(() => pending.transitionTo(MediaStatus.READY)).toThrow(
      'Invalid media status transition: PENDING -> READY.',
    );

    const deleted = pending
      .transitionTo(MediaStatus.REJECTED)
      .transitionTo(MediaStatus.DELETING)
      .transitionTo(MediaStatus.DELETED);
    expect(deleted.isDeleted).toBe(true);
    expect(deleted.canTransitionTo(MediaStatus.PROCESSING)).toBe(false);
  });
});
