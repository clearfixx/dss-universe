/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/application/services/media-upload-session.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies owner-scoped Media upload-session orchestration.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { ConflictException, NotFoundException } from '@nestjs/common';

import { MediaStorageProvider } from '../../domain/enums/media-storage-provider.enum';
import { MediaUploadStatus } from '../../domain/enums/media-upload-status.enum';
import type { MediaUploadSessionRepository } from '../../domain/repositories/media-upload-session.repository.interface';
import type { MediaUploadSession } from '../../domain/types/media-upload-session.type';
import { MediaUploadPolicyService } from './media-upload-policy.service';
import { MediaUploadSessionService } from './media-upload-session.service';

const createSession = (
  overrides: Partial<MediaUploadSession> = {},
): MediaUploadSession => ({
  id: 'session-1',
  ownerId: 'owner-1',
  policyKey: 'avatar',
  status: MediaUploadStatus.INITIATED,
  storageProvider: MediaStorageProvider.LOCAL,
  bucket: 'media',
  temporaryKey: 'temporary/owner-1/upload-1',
  originalFilename: 'avatar.png',
  declaredMimeType: 'image/png',
  declaredSize: 1024,
  checksum: null,
  metadata: null,
  expiresAt: new Date('2026-07-18T12:15:00.000Z'),
  completedAt: null,
  createdAt: new Date('2026-07-18T12:00:00.000Z'),
  updatedAt: new Date('2026-07-18T12:00:00.000Z'),
  ...overrides,
});

describe('MediaUploadSessionService', () => {
  let repository: jest.Mocked<MediaUploadSessionRepository>;
  let service: MediaUploadSessionService;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      updateStatus: jest.fn(),
    };
    service = new MediaUploadSessionService(
      repository,
      new MediaUploadPolicyService(),
    );
  });

  it('creates a validated short-lived session with an opaque key', async () => {
    const now = new Date('2026-07-18T12:00:00.000Z');
    repository.create.mockImplementation((input) =>
      Promise.resolve(
        createSession({
          ...input,
          id: 'session-created',
          status: MediaUploadStatus.INITIATED,
          checksum: input.checksum ?? null,
          metadata: input.metadata ?? null,
          completedAt: null,
          createdAt: now,
          updatedAt: now,
        }),
      ),
    );

    const session = await service.initiate(
      'owner-1',
      {
        policyKey: 'avatar',
        originalFilename: 'Avatar.PNG',
        declaredMimeType: 'IMAGE/PNG',
        declaredSize: 1024,
        checksum: ' checksum ',
      },
      now,
    );

    expect(repository.create.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        ownerId: 'owner-1',
        declaredMimeType: 'image/png',
        checksum: 'checksum',
        expiresAt: new Date('2026-07-18T12:15:00.000Z'),
      }),
    );
    expect(session.temporaryKey).toMatch(/^temporary\/owner-1\/[0-9a-f-]{36}$/);
  });

  it('does not disclose a session owned by another user', async () => {
    repository.findById.mockResolvedValue(
      createSession({ ownerId: 'other-owner' }),
    );

    await expect(service.findOwned('owner-1', 'session-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('aborts an initiated owner session', async () => {
    const session = createSession();
    repository.findById.mockResolvedValue(session);
    repository.updateStatus.mockResolvedValue(
      createSession({ status: MediaUploadStatus.ABORTED }),
    );

    await expect(service.abort('owner-1', session.id)).resolves.toMatchObject({
      status: MediaUploadStatus.ABORTED,
    });
    expect(repository.updateStatus.mock.calls[0]).toEqual([
      session.id,
      MediaUploadStatus.ABORTED,
    ]);
  });

  it('rejects aborting a completed session', async () => {
    repository.findById.mockResolvedValue(
      createSession({ status: MediaUploadStatus.COMPLETED }),
    );

    await expect(service.abort('owner-1', 'session-1')).rejects.toThrow(
      ConflictException,
    );
  });
});
