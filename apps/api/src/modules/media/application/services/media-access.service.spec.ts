/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media Tests
 * 📄 File: apps/api/src/modules/media/application/services/media-access.service.spec.ts
 *
 * 🎯 Purpose:
 * Verifies Media visibility authorization before signed URL issuance.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type { AuthenticatedUser } from '@api/core/auth';
import { Permission } from '@api/core/authorization';

import { MediaStatus } from '../../domain/enums/media-status.enum';
import { MediaVisibility } from '../../domain/enums/media-visibility.enum';
import type { MediaRepository } from '../../domain/repositories/media.repository.interface';
import { MediaAccessService } from './media-access.service';
import type { MediaUrlSignerService } from './media-url-signer.service';

const user: AuthenticatedUser = {
  id: 'user-1',
  email: 'user@dss.test',
  username: 'user',
  roles: [],
  permissions: [],
};

const candidate = {
  mediaId: 'media-1',
  ownerId: 'owner-1',
  status: MediaStatus.READY,
  visibility: MediaVisibility.PRIVATE,
  variantName: 'document',
  storageKey: 'private/document.pdf',
  mimeType: 'application/pdf',
  checksum: 'checksum',
};

describe('MediaAccessService', () => {
  const findDeliveryCandidate = jest.fn();
  const repository = {
    findDeliveryCandidate,
  } as unknown as MediaRepository;
  const issue = jest.fn(() => ({
    token: 'signed-token',
    payload: {
      mediaId: 'media-1',
      variantName: 'document',
      subjectId: 'user-1',
      expiresAt: 1_785_000_300,
    },
  }));
  const signer = { issue } as unknown as MediaUrlSignerService;
  const service = new MediaAccessService(repository, signer);

  beforeEach(() => {
    jest.clearAllMocks();
    findDeliveryCandidate.mockResolvedValue(candidate);
  });

  it('allows an owner to access private media', async () => {
    await expect(
      service.issue({ ...user, id: 'owner-1' }, 'media-1', 'document'),
    ).resolves.toMatchObject({ url: '/api/media/signed/signed-token' });
  });

  it('denies private media to another authenticated user', async () => {
    await expect(
      service.issue(user, 'media-1', 'document'),
    ).rejects.toMatchObject({ status: 403 });
    expect(issue).not.toHaveBeenCalled();
  });

  it('allows restricted media through the explicit permission', async () => {
    findDeliveryCandidate.mockResolvedValue({
      ...candidate,
      visibility: MediaVisibility.RESTRICTED,
    });

    await expect(
      service.issue(
        {
          ...user,
          permissions: [Permission.MediaRestrictedRead],
        },
        'media-1',
        'document',
      ),
    ).resolves.toBeDefined();
  });
});
