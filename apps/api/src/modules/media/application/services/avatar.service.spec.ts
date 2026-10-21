/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media Tests
 * 📄 File: apps/api/src/modules/media/application/services/avatar.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies ownership, readiness, variant, and removal rules for avatars.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { AvatarRepository } from '../../domain/repositories/avatar.repository.interface';
import { MediaKind } from '../../domain/enums/media-kind.enum';
import { MediaStatus } from '../../domain/enums/media-status.enum';
import { MediaVisibility } from '../../domain/enums/media-visibility.enum';
import { AvatarService } from './avatar.service';

const candidate = {
  id: 'media-1',
  ownerId: 'user-1',
  kind: MediaKind.IMAGE,
  status: MediaStatus.READY,
  visibility: MediaVisibility.PUBLIC,
  variants: [
    {
      name: 'avatar-256',
      storageKey: 'media/avatar-256.webp',
      mimeType: 'image/webp',
    },
  ],
};

describe('AvatarService', () => {
  const findCandidate: jest.MockedFunction<AvatarRepository['findCandidate']> =
    jest.fn();
  const assign: jest.MockedFunction<AvatarRepository['assign']> = jest.fn();
  const remove: jest.MockedFunction<AvatarRepository['remove']> = jest.fn();
  const repository: jest.Mocked<AvatarRepository> = {
    findCandidate,
    assign,
    remove,
  };
  const service = new AvatarService(repository);

  beforeEach(() => jest.clearAllMocks());

  it('assigns an owned ready public avatar variant', async () => {
    repository.findCandidate.mockResolvedValue(candidate);

    await service.assign('user-1', 'media-1');

    expect(assign).toHaveBeenCalledWith({
      userId: 'user-1',
      actorId: 'user-1',
      mediaId: 'media-1',
      avatarUrl: '/api/media/public/media-1/avatar-256',
    });
  });

  it('rejects media owned by another user', async () => {
    repository.findCandidate.mockResolvedValue({
      ...candidate,
      ownerId: 'user-2',
    });

    await expect(service.assign('user-1', 'media-1')).rejects.toMatchObject({
      status: 403,
    });
    expect(assign).not.toHaveBeenCalled();
  });

  it('rejects media without the canonical avatar variant', async () => {
    repository.findCandidate.mockResolvedValue({
      ...candidate,
      variants: [],
    });

    await expect(service.assign('user-1', 'media-1')).rejects.toMatchObject({
      status: 400,
    });
  });

  it('delegates avatar removal for the authenticated owner', async () => {
    await service.remove('user-1');

    expect(remove).toHaveBeenCalledWith('user-1', 'user-1');
  });
});
