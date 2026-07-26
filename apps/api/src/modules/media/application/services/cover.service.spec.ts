/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media Tests
 * 📄 File: apps/api/src/modules/media/application/services/cover.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies ownership, readiness, variant, and removal rules for profile covers.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { MediaKind } from '../../domain/enums/media-kind.enum';
import { MediaStatus } from '../../domain/enums/media-status.enum';
import { MediaVisibility } from '../../domain/enums/media-visibility.enum';
import type { CoverRepository } from '../../domain/repositories/cover.repository.interface';
import { CoverService } from './cover.service';

const candidate = {
  id: 'media-1',
  ownerId: 'user-1',
  kind: MediaKind.IMAGE,
  status: MediaStatus.READY,
  visibility: MediaVisibility.PUBLIC,
  variants: [
    {
      name: 'cover-1280',
      storageKey: 'media/cover-1280.webp',
      mimeType: 'image/webp',
    },
  ],
};

describe('CoverService', () => {
  const findCandidate: jest.MockedFunction<CoverRepository['findCandidate']> =
    jest.fn();
  const assign: jest.MockedFunction<CoverRepository['assign']> = jest.fn();
  const remove: jest.MockedFunction<CoverRepository['remove']> = jest.fn();
  const repository: jest.Mocked<CoverRepository> = {
    findCandidate,
    assign,
    remove,
  };
  const service = new CoverService(repository);

  beforeEach(() => jest.clearAllMocks());

  it('assigns an owned ready public cover variant', async () => {
    findCandidate.mockResolvedValue(candidate);

    await service.assign('user-1', 'media-1');

    expect(assign).toHaveBeenCalledWith({
      userId: 'user-1',
      actorId: 'user-1',
      mediaId: 'media-1',
      coverUrl: '/api/media/public/media-1/cover-1280',
    });
  });

  it('rejects media owned by another user', async () => {
    findCandidate.mockResolvedValue({ ...candidate, ownerId: 'user-2' });

    await expect(service.assign('user-1', 'media-1')).rejects.toMatchObject({
      status: 403,
    });
    expect(assign).not.toHaveBeenCalled();
  });

  it('rejects media without the canonical cover variant', async () => {
    findCandidate.mockResolvedValue({ ...candidate, variants: [] });

    await expect(service.assign('user-1', 'media-1')).rejects.toMatchObject({
      status: 400,
    });
  });

  it('delegates cover removal for the authenticated owner', async () => {
    await service.remove('user-1');

    expect(remove).toHaveBeenCalledWith('user-1', 'user-1');
  });
});
